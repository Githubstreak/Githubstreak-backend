import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    owner: {
      type: String,
      required: true,
      trim: true,
    },
    ownerAvatar: {
      type: String,
      default: "",
    },
    description: {
      type: String,
      default: "",
    },
    repoUrl: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    homepage: {
      type: String,
      default: "",
    },
    language: {
      type: String,
      default: "",
    },
    stars: {
      type: Number,
      default: 0,
    },
    forks: {
      type: Number,
      default: 0,
    },
    watchers: {
      type: Number,
      default: 0,
    },
    contributors: {
      type: Number,
      default: 0,
    },
    techStack: {
      type: [String],
      default: [],
    },
    topics: {
      type: [String],
      default: [],
    },
    lookingForContributors: {
      type: Boolean,
      default: false,
    },
    submittedBy: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for search performance
projectSchema.index({ name: "text", description: "text", owner: "text" });
projectSchema.index({ language: 1 });
projectSchema.index({ lookingForContributors: 1 });
projectSchema.index({ submittedBy: 1 });
projectSchema.index({ stars: -1 });
projectSchema.index({ createdAt: -1 });

const Project = mongoose.model("Project", projectSchema);

export default Project;
