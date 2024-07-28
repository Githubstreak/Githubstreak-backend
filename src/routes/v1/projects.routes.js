import express from "express";
import { getContributors } from "../../controllers/projects.controller.js";
import apicache from "apicache";
import { cacheTime } from "../../utils/constants.js";

const projectsRouter = express.Router();
const { middleware: cache } = apicache;

const onlyStatus200 = (_, res) => res.statusCode === 200;

projectsRouter.get(
  "/contributors",
  cache(cacheTime.API_CACHE_TIME, onlyStatus200),
  getContributors,
);

export default projectsRouter;
