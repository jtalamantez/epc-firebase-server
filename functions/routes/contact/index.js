//INIT EXPRESS ROUTES
const routes = require('express').Router();

//Send Grid Setup
const sendGridMail = require('@sendgrid/mail');
sendGridMail.setApiKey('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');


/***********************************************************/
//EMAIL FUNCTIONS
/***********************************************************/


routes.post ('/contact', async (req, res) => {
    const user = req.body.user
    const message = req.body.message
    const data = {
        to: 'joe@cabdash.com',
        from: 'EPC App <chefaustin@elitepersonalchefs.com>',
        subject: 'EPC App Contact',
        text: message+'\n\n'+user.name
    }
    try {
        const sendGridEmail = await sendGridMail.send(data)
        console.log(sendGridEmail)
        return res.status(200).send("Thank you for your feedback. We will be responding to you shortly.");
    } catch (error) {
        console.log(error)
        return res.status(400).send({error:error});
    }
})
   
//EXPORT ROUTES
module.exports = routes;