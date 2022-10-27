//INCLUDE HELPERS
const helpers = require('../../helpers')

//INIT EXPRESS ROUTES
const routes = require('express').Router()

//Stripe Libraries
const stripe = require('stripe')('sk_test_51IJ2w6ATfAVZI5c3jgP5x6DtYz3JQA62tVPdUBu2yFMj7t3jWm10teOIXmmSqsSl42dMhNDUqjRxAzjQbQShPMOv00zJe2dMdI');
const stripeLive = require('stripe')('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')

/****************************************************/
//FIREBASE SETUP
/****************************************************/
const admin = require('firebase-admin')
const db = admin.firestore()

/***********************************************************/
//STRIPE FUNCTIONS
/***********************************************************/

//Check balance - good ping test
routes.get('/balance', async (req, res) => {
    stripe.balance.retrieve(function(err, balance) {
        return res.json(balance);
    });
});

routes.post('/validate', async (req, res) => {
    let number = req.body.number
    let expiration = req.body.expiration
    let cvc = req.body.cvc;
    let exp_month = expiration.split('/').slice(0, -1).join('')
    let exp_year = expiration.split('/').slice(-1).join('')
    try {
        const paymentMethod = await stripe.paymentMethods.create({
            type: 'card',
            card: {
                number: number,
                exp_month: exp_month,
                exp_year: exp_year,
                cvc: cvc,
            },
        });

        const setupIntent = await stripe.setupIntents.create({
            confirm: true,
            payment_method_types: ['card'],
            payment_method: paymentMethod.id
        });

        return res.status(200).json({success:"valid"});
    }
    catch (error) {
        return res.status(400).json({error:error});
    }
});


//Create the customer
routes.post('/customer', async (req, res) => {
    let full_name = req.body.full_name
    let number = req.body.number
    let expiration = req.body.expiration
    let exp_month = expiration.split('/').slice(0, -1).join('')
    let exp_year = expiration.split('/').slice(-1).join('')
    let cvc = req.body.cvc;
    
    try {
        //Create the customer
        const customer = await stripe.customers.create({
            name: full_name,
        });

        //Setup credit card
        const cardData =  {
            number: number,
            exp_month: exp_month,
            exp_year: exp_year,
            cvc: cvc,
        }
        const [paymentMethod, setupIntent] = await addCreditCard(cardData,customer.id)

        //Update Firsebase DB User with Stripe info 
        let stripe_info = {
            customerID: customer.id,
            paymentMethodID: paymentMethod.id,
            intentID: setupIntent.id,
            brand: paymentMethod.card.brand,
            last4: paymentMethod.card.last4,
            expiration: paymentMethod.card.exp_month+'/'+paymentMethod.card.exp_year,
        }   

        return res.status(200).json(stripe_info);
     }
    catch (error) {
        console.error(error)
        return res.status(400).json({error:error});
    }
});


//Create the customer
routes.post('/update_payment', async (req, res) => {
    let uid = req.body.uid
    let number = req.body.number
    let expiration = req.body.expiration
    let cvc = req.body.cvc;
    let exp_month = expiration.split('/').slice(0, -1).join('')
    let exp_year = expiration.split('/').slice(-1).join('')
    try {
        const userRef = await helpers.getUserByID(uid,"id")
        const doc = await userRef.get();
        if (doc.exists) {
            //Find existing user details
            const userDetails = doc.data()
            
            //Setup credit card
            const cardData =  {
                number: number,
                exp_month: exp_month,
                exp_year: exp_year,
                cvc: cvc,
            }
            const [paymentMethod, setupIntent] = await addCreditCard(cardData,userDetails.stripe_info.customerID)

            //Update Firsebase DB User with Stripe info 
            let new_stripe_info = {
                customerID: userDetails.stripe_info.customerID,
                paymentMethodID: paymentMethod.id,
                intentID: setupIntent.id,
                brand: paymentMethod.card.brand,
                last4: paymentMethod.card.last4,
                expiration: paymentMethod.card.exp_month+'/'+paymentMethod.card.exp_year
            }   

            const update = await db.collection("users").doc(uid).update({stripe_info:new_stripe_info});
            return res.status(200).json(paymentMethod);
        }
        else{
            return res.status(400).json({error:error});
        }
    }
    catch (error) {
        console.error(error)
        return res.status(400).json({error:error});
    }
});


/***********************************************************/
//HELPER FUNCTIONS
/***********************************************************/

async function addCreditCard (cardData,customerID) {
    //Create their payment method
    const paymentMethod = await stripe.paymentMethods.create({
        type: 'card',
        card: cardData,
    });

    //Setup an intent to use the card later
    const setupIntent = await stripe.setupIntents.create({
        payment_method_types: ['card'],
        customer: customerID,
        payment_method: paymentMethod.id
    });

    const attach = await stripe.paymentMethods.attach(
        paymentMethod.id, {
            customer: customerID,
        }
    );

    return [paymentMethod, setupIntent]
}


async function chargeCreditCard (stripe_info,amount,isReload = false) {
    //Charge the user
    let paymentIntent = await stripe.paymentIntents.create({
        amount: Math.trunc(amount*100),
        currency: 'usd',
        customer: stripe_info.customerID,
        payment_method: stripe_info.paymentMethodID,
        description: 'Payment from EPC App',
        metadata: {
            isReload: isReload,
            isTip: false,
        },
        confirm: true //make sure card is valid
    });

    return paymentIntent
}

//EXPORT ROUTES
module.exports = routes;