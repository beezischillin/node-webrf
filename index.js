const fs         = require("fs");
const rf         = require("rpi-433-v3")
const express    = require("express");
const app        = express();
const handlebars = require("handlebars");
const _          = require("lodash");

const config     = require("./config.json");
const template   = fs.readFileSync('index.twig', 'utf8');
const indexTpl   = handlebars.compile(template);
const port       = config.port;

const IP         = _.chain(Object.values(require("os").networkInterfaces()))
                    .flatten()
                    .filter(({family, internal}) => family === "IPv4" && !internal)
                    .map(({address}) => address)
                    .head()
                    .value();

app.get("/", (req, res) => {
    console.log("sending /");

    res.send(indexTpl({commands: config.commands}));
})

app.get("/execute/:action", (req, res) => {
    if (!_.keys(config.commands).includes(req.params.action)) {
        console.log("rf command not set, returning");

        res.send("<h1>invalid command.</h1><a href=\"/\">back</a>");
        return;
    }

    console.log("sending rf command " + req.params.action);

    const rfEmitter = rf.emitter({
        pin: config.pins.send,
        pulseLength: config.commands[req.params.action].pulse,
        protocol: 1
    });

    rfEmitter.sendCode(config.commands[req.params.action].code, (error, stdout) => {
        console.log(error, stdout);
    });

    console.log("ok, redirecting to home");

    res.redirect("/");
});

app.get("/api/v1/", (req, res) => {
    console.log("sending /api/v1");

    res.send({
        status: "ok",
        statusCode: 200,
        data: _.mapValues(config.commands, item => item.label)
    });
});

app.post("/api/v1/:action", (req, res) => {
    if (!_.keys(config.commands).includes(req.params.action)) {
        console.log("api rf command not set, returning");

        res.send({
            status: "error",
            statusCode: 404
        });
        return;
    }

    console.log("sending rf command " + req.params.action);

    const rfEmitter = rf.emitter({
        pin: config.pins.send,
        pulseLength: config.commands[req.params.action].pulse,
        protocol: 1
    });


    rfEmitter.sendCode(config.commands[req.params.action].code, (error, stdout) => {
        console.log(error, stdout);
    });

    console.log("sending /api/v1/" + req.params.action);

    res.send({
        status: "ok",
        statusCode: 200,
        data: req.params.action
    });
})

app.listen(port, () => {
    console.log(`WebRF listening at http://${IP}:${port}`);
})
