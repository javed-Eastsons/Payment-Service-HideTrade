const express = require("express");
const cors = require("cors");
const app = express();
const bodyParser = require("body-parser");

const stripe = require('stripe')('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');

const axios = require("axios");

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
app.use(express.urlencoded({ extended: true })); // Middleware to parse form data

app.post('/webhooks', async (req, res) => {
    let event = req.body;

    console.log(event.type);

    let result;

    switch (event.type) {
        case "invoice.paid":
            result =  await subscription_created(req);
            break;
        case "checkout.session.completed":
            result = await updatePaymentMethod(req);
            break;
        default:
            return res.status(200).send("Invalid Event Detected");
    }

    if (res.status === 400) {
        return res.status(400).send(result);
    }

    return res.status(200).send(result);
    
});

app.post("/create-subscription", async (req, res) => {
    console.log(req.body);

    const customers = await stripe.customers.list({
        email : req.body.email
    });

    let cid = "";

    if (customers.data.length == 0) {
        const customer = await stripe.customers.create({
            email: req.body.email,
            name: req.body.name
        });
        cid = customer.id;
    } else {
        console.log("Exists...");
        cid = customers.data[0].id;
    }

    const priceId = "price_1NpVBGLt3bt57eoNrAKC9lPm";

    try {
        const subscription = await stripe.subscriptions.create({
          customer: cid,
          items: [{
            price: priceId,
          }],
          payment_behavior: 'default_incomplete',
          payment_settings: { save_default_payment_method: 'on_subscription' },
          expand: ['latest_invoice.payment_intent'],
        });

        console.log(subscription.latest_invoice.payment_intent.client_secret);
    
        res.send({
          subscriptionId: subscription.id,
          clientSecret: subscription.latest_invoice.payment_intent.client_secret,
          customerId : cid
        });
    } catch (error) {
        return res.status(400).send({ error: { message: error.message } });
    }
});

app.post("/retrive-subsciption", async (req, res) => {
    console.log(req.body);
    if (req.body.subId === undefined) {
        return res.status(400).send("Invalid Id");
    }

    const subsciption = await stripe.subscriptions.retrieve(
        req.body.subId
    );

    res.status(200).send({
        payId : subsciption.default_payment_method,
        cancel : subsciption.cancel_at_period_end
    })
});

app.post("/get-payment-method-details", async (req, res) => {
    if (req.body.payId === undefined) {
        return res.status(400).send("Invalid Id");
    }

    const paymentMethod = await stripe.paymentMethods.retrieve(
        req.body.payId
    );

    return res.status(200).send({
        data : paymentMethod
    });
});

app.post("/cancel-subscription-update", async (req, res) => {
    if (req.body.subId === undefined || req.body.status === undefined) {
        return res.status(400).send("Invalid Id");
    }

    const paymentMethod = await stripe.subscriptions.update(
        req.body.subId, 
        {cancel_at_period_end: req.body.status}
    );

    return res.status(200).send({
        data : paymentMethod
    });
});

app.post("/checkout-session", async (req, res) => {
    console.log(req.body);
    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'setup',
        customer: req.body.cusId,
        setup_intent_data: {
          metadata: {
            customer_id: req.body.cusId,
            subscription_id: req.body.subId,
          },
        },
        success_url: 'https://example.com/success?sc_checkout=success',
        cancel_url: 'https://example.com/cancel?sc_checkout=cancel',
    });

    res.status(200).send({
        session : session
    });
});

const subscription_created = async (req) => {

    try {
        const cid = req.body.data.object.customer;

        const responseOfCid = await stripe.customers.retrieve(cid);
        const userId = responseOfCid.name;

        const subscription = await stripe.subscriptions.list({
            limit : 1,
            customer : cid
        });

        const subId = subscription.data[0].id;
        const endTimeStamp = subscription.data[0].current_period_end;
        const status = subscription.data[0].status;

        console.log("Sub Id : " + subId);
        console.log("End Time Stamp : " + endTimeStamp);

        console.log(status)

        // update into the api

        if (status === "active") {
            console.log("updating into database");

            const params = new URLSearchParams();

            params.append('user_id', userId);
            params.append('subscription_id', subId);
            params.append('customer_id', cid);
            params.append('timestamp', endTimeStamp);
        
            // let url = "https://refuel.site/projects/hidetrade/APIs/UpdateProfile/UpdateProfileWithSubscription.php";
        let url = "https://www.hidetrade.eu/app/APIs/UpdateProfile/UpdateProfileWithSubscription.php";

            axios.post(url, params).then((result) => {
                console.log(result);
                console.log(result.data);
            }).catch((err) => {
                console.log(err);
                return { status : 400, error : err };
            });

            return { status : 200, message : "All Good" };
        }
    } catch(errr) {
        console.log(errr);
        return { status : 400, error : errr };
    }
};

const updatePaymentMethod = async (req) => {
    try {
        const setupIntentId = req.body.data.object.setup_intent;
        console.log(setupIntentId);

        const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);

        const cusId = setupIntent.customer;
        const subId = setupIntent.metadata.subscription_id;
        const payId = setupIntent.payment_method;

        console.log(cusId);
        console.log(subId);
        console.log(payId);

        console.log("upadting the customer default method : ");

        const customer = await stripe.customers.update(
            cusId,
            {invoice_settings: {default_payment_method: payId}}
        );

        console.log(customer);

        console.log("updating the subscription");

        const subscription = await stripe.subscriptions.update(subId, {
            default_payment_method: payId,
        });

        console.log(subscription);

        return { status : 200, message : "All Good" };

    } catch(error) {
        return { status : 400, error : error };
    }
}

// handle the error safely
process.on("uncaughtException", (err) => {
	console.log(err);
});

module.exports = app;
