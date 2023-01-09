require("dotenv").config();
const app = require("./app");
const http = require("http");
const chalk = require("chalk");

function normalizePort(val) {
	const port = parseInt(val, 10);

	if (Number.isNaN(port)) {
		return val;
	}

	if (port >= 0) {
		return port;
	}

	return false;
}

const port = normalizePort(process.env.PORT);
app.set("port", port);

const server = http.createServer(app);

function onError(error) {
	if (error.syscall !== "listen") {
		throw error;
	}

	const bind = typeof port === "string" ? `Pipe ${port}` : `Port ${port}`;

	switch (error.code) {
		case "EACCES":
			console.error(`${bind} requires elevated privileges`);
			break;
		case "EADDRINUSE":
			console.error(`${bind} is already in use`);
			break;
	};

	throw error;
}

function onListening() {
	const addr = server.address();
	const bind = typeof addr === "string" ? `pipe ${addr}` : `port ${addr.port}`;

	console.log(chalk.green(
		`Server running in ${process.env.ENV || "development"} mode on ${bind}`
	));
	console.log(chalk.green(
		`Backend Available At http://localhost:` + addr.port
	));
}

server.listen(port);
server.on("error", onError);
server.on("listening", onListening);

module.exports = app;