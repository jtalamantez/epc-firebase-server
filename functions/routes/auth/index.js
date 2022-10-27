//INIT EXPRESS ROUTES
const routes = require('express').Router();

//Encryption Libraries Setup
const crypto = require('crypto');
const base64 = require('base-64');
const algorithm = 'aes-256-ctr';
const secretKey = 'vOVH6sdmpNWjRRIqCc7rdxs01lwHzfr3';
const iv = crypto.randomBytes(16);
const _ = require('underscore')

/****************************************************/
//FIREBASE SETUP
/****************************************************/
const admin = require('firebase-admin')
const db = admin.firestore()


//Send Grid Setup
const sendGridMail = require('@sendgrid/mail');
sendGridMail.setApiKey('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');


/***********************************************************/
//LOGIN AND PASSWORDS FUNCTIONS
/***********************************************************/


routes.post('/send_verification', async (req, res) => {
    const id = req.body.id
    const email = req.body.email
    const userType = req.body.type
    const link = 'https://us-central1-elite-ee4b7.cloudfunctions.net/api/v1/auth/verify/'+encodeURIComponent(email)+'/'+id+'/'+userType

    const data = {
        to: email,
        from: 'EPC App <chefaustin@elitepersonalchefs.com>',
        subject: 'EPC App - Verifiy Your Email',
        text: 'Thank you for signing up to EPC. Please click here to verify your email address \n\n'+link
    }
    try {
        const sendGridEmail = await sendGridMail.send(data)
        console.log(sendGridEmail)
        return res.status(200).send("Done");
    } catch (error) {
        console.log(error)
        return res.status(400).send({error:error});
    }

})

routes.get('/verify/:email/:id/:type', async (req, res) => {
    const email = decodeURIComponent(req.params.email)
    const id = req.params.id
    const userType = req.params.type
    try {
        const docRef = db.collection(userType).doc(id);
        const doc = await docRef.get();
        if (doc.exists) {
            let user = doc.data();
            //Make sure emails match so we can verify
            if(user.email == email){
                //They matched updated their flag
                await db.collection(userType).doc(doc.id).update({
                    isEmailVerified: true
                })
                return res.status(200).send('Thank you your email has been verified. You may now return to the EPC app.')
            }
            else{
                console.log(email)
                res.status(500).send("Email doesnt match")
            }
        }
        else{
            res.status(500).send("User not found")
        }
    } catch (error) {
        res.status(400).send("Something wrong"+error);
    }
});



routes.post('/encrypt', async (req, res) => {
    let password = req.body.password;
    const cipher = crypto.createCipheriv(algorithm, secretKey, iv);
    const encrypted = Buffer.concat([cipher.update(password), cipher.final()]);
    const hashed = JSON.stringify({
        iv: iv.toString('hex'),
        content: encrypted.toString('hex')
    })
    res.status(200).send(base64.encode(hashed));
});


/***********************************************************/
//HELPER FUNCTIONS
/***********************************************************/
async function decrypt(hashed){
    const hash = JSON.parse(base64.decode(hashed))
    const decipher = crypto.createDecipheriv(algorithm, secretKey, Buffer.from(hash.iv, 'hex'));
    const decrpyted = Buffer.concat([decipher.update(Buffer.from(hash.content, 'hex')), decipher.final()]);
    return decrpyted.toString();
}
   
//EXPORT ROUTES
module.exports = routes;