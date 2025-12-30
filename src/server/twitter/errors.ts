export class TwitterAPIError extends Error {
  constructor(message: string, public payload?: unknown) {
    super(message);
    this.name = "TwitterAPIError";
  }
}

export class SchedulerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SchedulerError";
  }
}
