import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "@/lib/redis";

export const feedbackRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "1 m"),
  prefix: "@upstash/ratelimit/feedback",
});
