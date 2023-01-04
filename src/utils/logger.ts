import winston from "winston";

const logFormat = winston.format.printf(info => {
    const formattedDate = info.timestamp.replace("T", " ").replace("Z", "");
    return `${formattedDate}|${info.level}|${
     info.message
    }`;
});

const options: winston.LoggerOptions = {
    format: winston.format.combine(
        winston.format.timestamp(),
        logFormat
    ),
    transports: [
        new winston.transports.Console({
            level: process.env.NODE_ENV === "production" ? "info" : "debug"
        }),
        //new winston.transports.File({ filename: "debug.log", level: "debug" })
    ]
};

const logger = winston.createLogger(options);

if (process.env.NODE_ENV !== "production") {
    logger.debug("Logging initialized at debug level");
}

export default logger;