const express = require("express");
const cors = require("cors");
const app = express();
const bodyParser = require("body-parser");

const stripe = require('stripe')('sk_test_51MMu5kLt3bt57eoNf5hXuaIKsIjrIqGHkeEUNagFlQDm4p1LcxXOc9hkbDsjQVlyitl0UjzxwrYzAiz846KBeURE00tBwSYqxc');

app.use(function(req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	next();
});

app.use(cors({origin: true, credentials: true}));
app.use(bodyParser.json({ limit: "30mb", extended: true}));
app.use(bodyParser.urlencoded({ limit: "30mb", extended: true}));

// Home route
app.get("/", (_req, res) => {
	console.log("checked");
	res.status(200).json({ message: "Hello There!! You are at Backend" });
});

app.post("/payment", async (req, res) => {
	
	// validating amount

    let amount = (req.body.amount+"").trim();

    // amount empty or undefined
    if(req.body.amount === undefined || amount === "") {
        return res.status(400).send("Invalid data");
    } 

    // amount must be number
    let isNum = /^\d{1,}\.?\d{0,2}$/.test(amount);
    if(!isNum) return res.status(400).send("Invalid data");

    amount = parseInt(amount);

    // amount must be greater than zero
    if(amount <= 0) return res.status(400).send("Invalid data");;

    var paymentIntent;
    try{
        paymentIntent = await stripe.paymentIntents.create({
            amount: amount,
            currency: 'usd',
            payment_method_types: ['card'],
        });
    }catch(e) {
        console.log(e)
        res.status(400).send("Error");
    } 

    res.status(200).send({
		paymentIntent : paymentIntent,
		publishableKey : "pk_test_51MMu5kLt3bt57eoN31c7NdtotLS2VsUgzf3TPC3fzhCjAu3Wqa3mOAV1SpSjWPInyFdsAnf5wf2kIutILMpPORDt00tdY821ah"
	})
});

// handle the error safely
process.on("uncaughtException", (err) => {
	console.log(err);
});

module.exports = app;