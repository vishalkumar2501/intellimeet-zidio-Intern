import { Meeting } from "../models/meetingModel.js";
import { customAlphabet } from "nanoid";
import redisClient from "../config/redis.js";
import { getIO } from "../sockets/socket.js";
import { cloudinary } from "../config/cloudinary.js";
import { Readable } from "stream";

const CACHE_EXPIRATION = 3600;
const generateMeetingCode = customAlphabet('123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 10);

export const createMeeting = async (req, res) => {
  try {
    const { title, startTime } = req.body;

    const existingMeeting = await Meeting.findOne({
      createdBy: req.user._id,
      status: { $ne: "ended" },
    });

    if (existingMeeting) {
      return res.status(400).json({
        message: "You already have an active meeting",
        activeCode: existingMeeting.meetingCode,
      });
    }

    const meetingCode = generateMeetingCode();

    const meeting = await Meeting.create({
      title,
      startTime: startTime || new Date(),
      meetingCode,
      createdBy: req.user._id,
      participants: [
        { user: req.user._id, role: "host", joinedAt: new Date() },
      ],
    });

    if (redisClient.isOpen) {
      await redisClient.del(`user-meetings:${req.user._id}`);
    }

    try {
      getIO().to(`user:${req.user._id}`).emit("meetings-updated");
    } catch {}

    res.status(201).json(meeting);
  } catch (error) {
    res.status(500).json({ message: "Error creating meeting" });
  }
};

export const endMeeting = async (req, res) => {
  try {
    const { code } = req.params;

    const meeting = await Meeting.findOne({ meetingCode: code });
    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found" });
    }

    const hostParticipant = meeting.participants.find((p) => p.role === "host");
    const isHost =
      hostParticipant?.user?.toString() === req.user._id.toString() ||
      meeting.createdBy?.toString() === req.user._id.toString();

    if (!isHost) {
      return res
        .status(403)
        .json({ message: "Only the host can end this meeting" });
    }

    if (meeting.status !== "ended") {
      meeting.status = "ended";
      meeting.endTime = new Date();
      meeting.participants.forEach((participant) => {
        if (!participant.leftAt) participant.leftAt = new Date();
      });
      await meeting.save();
    }

    if (redisClient.isOpen) {
      const userCacheKeys = new Set([
        `user-meetings:${meeting.createdBy.toString()}`,
        ...meeting.participants.map(
          (p) => `user-meetings:${p.user.toString()}`,
        ),
      ]);
      await redisClient.del(`meeting:${code}`);
      await Promise.all(
        [...userCacheKeys].map((cacheKey) => redisClient.del(cacheKey)),
      );
    }

    try {
      const io = getIO();
      const userIds = new Set([
        meeting.createdBy.toString(),
        ...meeting.participants.map((p) => p.user.toString()),
      ]);
      userIds.forEach((uid) => io.to(`user:${uid}`).emit("meetings-updated"));
    } catch {}

    try {
      const io = getIO();
      io.to(code).emit("meeting-ended", {
        meetingCode: code,
        message: "Meeting has ended by host",
      });
    } catch {}

    return res.status(200).json({
      message: "Meeting ended",
      meeting,
    });
  } catch (error) {
    return res.status(500).json({ message: "Error ending meeting" });
  }
};

export const getMyMeetings = async (req, res) => {
  try {
    const cacheKey = `user-meetings:${req.user._id}`;
    if (redisClient.isOpen) {
      const data = await redisClient.get(cacheKey);
      if (data) {
        console.log(`Cache Hit for user-meetings: ${req.user._id}`);
        return res.status(200).json(JSON.parse(data));
      }
    }

    const meetings = await Meeting.find({
      $or: [{ createdBy: req.user._id }, { "participants.user": req.user._id }],
    }).populate("createdBy", "name email avatar");

    if (redisClient.isOpen) {
      await redisClient.setEx(
        cacheKey,
        CACHE_EXPIRATION,
        JSON.stringify(meetings),
      );
      console.log(`Cache Miss - Stored user-meetings: ${req.user._id}`);
    }

    res.status(200).json(meetings);
  } catch (error) {
    res.status(500).json({ message: "Error fetching meetings" });
  }
};

export const joinMeeting = async (req, res) => {
  try {
    const { meetingCode } = req.body;
    if (!meetingCode) {
      return res.status(400).json({ message: "Meeting code is required" });
    }

    const meeting = await Meeting.findOne({ meetingCode });
    if (!meeting) return res.status(404).json({ message: "Meeting not found" });
    if (meeting.status === "ended")
      return res.status(400).json({ message: "Meeting already ended" });

    const joinerActiveMeeting = await Meeting.findOne({
      createdBy: req.user._id,
      status: { $ne: "ended" },
    });

    if (
      joinerActiveMeeting &&
      joinerActiveMeeting.meetingCode !== meetingCode
    ) {
      return res.status(403).json({
        message:
          "You cannot join other meetings while you have an active meeting of your own.",
        activeCode: joinerActiveMeeting.meetingCode,
      });
    }

    const isAlreadyParticipant = meeting.participants.some(
      (p) => p.user.toString() === req.user._id.toString(),
    );

    if (meeting.status === "scheduled") {
      meeting.status = "ongoing";
      meeting.startTime = meeting.startTime || new Date();
    }

    if (!isAlreadyParticipant) {
      meeting.participants.push({
        user: req.user._id,
        role: "member",
        joinedAt: new Date(),
      });

      if (redisClient.isOpen) {
        await redisClient.del(`meeting:${meetingCode}`);
        await redisClient.del(`user-meetings:${req.user._id}`);
      }
    }

    await meeting.save();

    try {
      const io = getIO();
      io.to(`user:${req.user._id}`).emit("meetings-updated");
      io.to(`user:${meeting.createdBy.toString()}`).emit("meetings-updated");
    } catch {}

    res.status(200).json(meeting);
  } catch (error) {
    res.status(500).json({ message: "Error joining meeting" });
  }
};

export const uploadMeetingRecording = async (req, res) => {
  try {
    const { code } = req.params;
    const meeting = await Meeting.findOne({ meetingCode: code });

    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found" });
    }

    const hostParticipant = meeting.participants.find((p) => p.role === "host");
    const isHost =
      hostParticipant?.user?.toString() === req.user._id.toString() ||
      meeting.createdBy?.toString() === req.user._id.toString();

    if (!isHost) {
      return res
        .status(403)
        .json({ message: "Only the host can upload meeting recording" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Recording file is required" });
    }

    const uploadedAsset = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: "video",
          folder: "intellmeet-recordings",
          public_id: `meeting-${code}-${Date.now()}`,
          overwrite: true,
        },
        (error, result) => {
          if (error || !result) {
            reject(error || new Error("Cloudinary upload failed"));
            return;
          }
          resolve(result);
        },
      );

      Readable.from(req.file.buffer).pipe(uploadStream);
    });

    meeting.recordingUrl = uploadedAsset.secure_url;
    await meeting.save();

    if (redisClient.isOpen) {
      const userCacheKeys = new Set([
        `user-meetings:${meeting.createdBy.toString()}`,
        ...meeting.participants.map(
          (p) => `user-meetings:${p.user.toString()}`,
        ),
      ]);
      await redisClient.del(`meeting:${code}`);
      await Promise.all(
        [...userCacheKeys].map((cacheKey) => redisClient.del(cacheKey)),
      );
    }

    try {
      const io = getIO();
      const userIds = new Set([
        meeting.createdBy.toString(),
        ...meeting.participants.map((p) => p.user.toString()),
      ]);
      userIds.forEach((uid) => io.to(`user:${uid}`).emit("meetings-updated"));
      io.to(code).emit("meeting-recording-ready", {
        meetingCode: code,
        recordingUrl: meeting.recordingUrl,
      });
    } catch {}

    return res.status(200).json({
      message: "Recording uploaded successfully",
      recordingUrl: meeting.recordingUrl,
      meeting,
    });
  } catch (error) {
    return res.status(500).json({ message: "Error uploading recording" });
  }
};

export const getMeetingDetails = async (req, res) => {
  try {
    const { code } = req.params;
    if (redisClient.isOpen) {
      const data = await redisClient.get(`meeting:${code}`);
      if (data) {
        console.log(`Cache Hit for meeting: ${code}`);
        return res.status(200).json(JSON.parse(data));
      }
    }

    const meeting = await Meeting.findOne({ meetingCode: code })
      .populate("participants.user", "name email avatar")
      .populate("createdBy", "name email avatar");

    if (!meeting) return res.status(404).json({ message: "Meeting not found" });

    if (redisClient.isOpen) {
      await redisClient.setEx(
        `meeting:${code}`,
        CACHE_EXPIRATION,
        JSON.stringify(meeting),
      );
      console.log(`Cache Miss - Stored meeting: ${code}`);
    }

    res.status(200).json(meeting);
  } catch (error) {
    res.status(500).json({ message: "Error fetching meeting details" });
  }
};
