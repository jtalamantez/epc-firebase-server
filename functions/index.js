/**********************************************************************************/
//FIREBASE SETUP
/**********************************************************************************/
const functions = require('firebase-functions')
const admin = require('firebase-admin')
const serviceAccount = require("./firebase-permissions.json")
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://elite-ee4b7.firebaseio.com"
});
const db = admin.firestore()
db.settings({ ignoreUndefinedProperties: true })


/**********************************************************************************/
//IMPORT LIBRARIES
/**********************************************************************************/
const express = require('express')
const bodyParser = require('body-parser')
const fetch = require("node-fetch")
const { get } = require('request')
const moment = require("moment")
const _ = require('underscore')
const { v4: uuidv4 } = require('uuid')
const util = require('util')

//CSV 
const fs = require('fs');
const path = require('path');
const csv = require('fast-csv');


//Include the homemade helpers library
const helpers = require('./helpers')


//Mailgun Setup
const api_key = 'key-2844480bd655baa81f254c9e7ba44f2b'
const domain = 'mg.hogsalt.com'
const mailgun = require('mailgun-js')({apiKey: api_key, domain: domain})


//Stripe Libraries
/*
const stripeSAND = require('stripe')('sk_test_51IJ2w6ATfAVZI5c3jgP5x6DtYz3JQA62tVPdUBu2yFMj7t3jWm10teOIXmmSqsSl42dMhNDUqjRxAzjQbQShPMOv00zJe2dMdI')
const stripe = require('stripe')('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')
*/

/**********************************************************************************/
//EXPREESS SETUP
/**********************************************************************************/
const cors = require('cors')({origin: true})
const app = express()
const main = express()
app.use(cors)
main.use(cors)
main.use(bodyParser.json())
main.use(bodyParser.urlencoded({ extended: false }))
main.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*")
    next()
})

/**************************/
//ROUTES SETUP
/**************************/
main.use('/v1', app); //"/v1" matches path setup in firebase.json
main.use('/v1/auth', require('./routes/auth')); 
main.use('/v1/stripe', require('./routes/stripe')); 
main.use('/v1/contact', require('./routes/contact')); 

/**************************/
//ERROR HANDLING
/**************************/
main.use(function (err, req, res, next) {
    //console.error(err.stack)
    console.error("Staus Code:"+req.statusCode)
    res.status(500).send('Something broke!')
})

//SENDGRID
const sendGrid = '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'


/**********************************************************************************/
//API STARTER ENDPOINTS AND EXAMPLES
/**********************************************************************************/
app.get('/hello', async (req, res) => {
    //console.error(new Error('I failed you'))
    //res.send("Hello World!")
    return res.status(200).send("Hello Firebase 5! Today is "+moment().format("YYYYMMDD")+"       {\n}---- "+uuidv4());
});

/********************************
Use "Awake" with Easy Cron as a way
to mitigate cold-starts from Firebase
https://www.easycron.com/user/login
********************************/
app.get('/awake', (req, res) => {
    console.log('stay awake');
    return res.status(200).send("AWAKE");
});

/**********************************************************************************/
//APP LOGIC
/**********************************************************************************/

//Get all menu templates
app.get('/delete', async (req, res) => {
    const collectionPath = '/chefs/4FA0ulojcRdBqqXjfpSzYjXFC7Y2/menus/TwnKaUkO6x7CCuASnb1G'
    //const result = await deleteCollection(db, collectionPath, 0)
    //console.log(result)


    const docRef = db.doc(collectionPath)
    const subcollections = await docRef.listCollections();
    for await (const subcollectionRef of subcollections) {
        const subcollectionPath = `${collectionPath}/${subcollectionRef.id}`
        console.log(subcollectionPath)
        const result = await deleteCollection(db, subcollectionPath, 0)
    }

    return res.status(200).send('deleted');
});


async function deleteCollection(db, collectionPath, batchSize) {
    const collectionRef = db.collection(collectionPath);
    const query = collectionRef.orderBy('__name__').limit(batchSize);
  
    return new Promise((resolve, reject) => {
      deleteQueryBatch(db, query, resolve).catch(reject);
    });
  }
  
  async function deleteQueryBatch(db, query, resolve) {
    const snapshot = await query.get();
  
    const batchSize = snapshot.size;
    if (batchSize === 0) {
      // When there are no documents left, we are done
      resolve();
      return;
    }
  
    // Delete documents in a batch
    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();
  
    // Recurse on the next process tick, to avoid
    // exploding the stack.
    process.nextTick(() => {
      deleteQueryBatch(db, query, resolve);
    });
  }



//Get all menu templates
app.get('/menu_templates', async (req, res) => {
    try {
        let snapshot = await db.collection("menu_templates2").orderBy('title','asc').get()
        let templates = []
        if (!snapshot.empty) {
            snapshot.forEach(doc => {
                let menu = doc.data()
                menu.id = doc.id
                templates.push(menu)
                console.log("menu",menu)
            })
            return res.status(200).json(templates);
        }
        else{
            res.status(500).send("No one is here")
        }
    } catch (error) {
        res.status(400).send("Something wrong"+error);
    }
});


//Get all menu templates
app.get('/event_templates', async (req, res) => {
    try {
        let snapshot = await db.collection("experience_templates").orderBy('title','asc').get()
        let templates = []
        if (!snapshot.empty) {
            snapshot.forEach(doc => {
                let menu = doc.data()
                menu.id = doc.id
                templates.push(menu)
                console.log("menu",menu)
            })
            return res.status(200).json(templates);
        }
        else{
            res.status(500).send("No one is here")
        }
    } catch (error) {
        res.status(400).send("Something wrong"+error);
    }
});


//Get all menu templates
app.get('/chefs', async (req, res) => {
    try {
        let snapshot = await db.collection("chefs").get()
        let chefs = []
        if (!snapshot.empty) {
            snapshot.forEach(doc => {
                let chef = doc.data()
                chef.id = doc.id
                chefs.push(chef)
                console.log("menu",chef)
            })
            return res.status(200).json(chefs);
        }
        else{
            res.status(500).send("No one is here")
        }
    } catch (error) {
        res.status(400).send("Something wrong"+error);
    }
});

//Get all events
app.get('/events', async (req, res) => {
    try {
        const chefID = req.params.chefID;
        let snapshot = await db.collection("experiences").get()
        let events = []
        if (!snapshot.empty) {
            snapshot.forEach(doc => {
                let event = doc.data()
                event.id = doc.id
                events.push(event)
                console.log("event",event)
            })
            return res.status(200).json(events);
        }
        else{
            res.status(200).json({error:"No events found"})
        }
    } catch (error) {
        res.status(400).send("Something wrong"+error);
    }
});


//Get all events by one chef
app.get('/events/:chefID', async (req, res) => {
    try {
        const chefID = req.params.chefID;
        let snapshot = await db.collection("experiences").where('chef_id', '==', chefID).get()
        let events = []
        if (!snapshot.empty) {
            snapshot.forEach(doc => {
                let event = doc.data()
                event.id = doc.id
                events.push(event)
                console.log("event",event)
            })
            return res.status(200).json(events);
        }
        else{
            res.status(200).json({error:"No events found"})
        }
    } catch (error) {
        res.status(400).send("Something wrong"+error);
    }
});


//Get all guest info
app.get('/guest/:guest_id', async (req, res) => {
    try {
        const guest_id = req.params.guest_id;
        const docRef = db.collection("guests").doc(guest_id);
        const doc = await docRef.get();
        if (doc.exists) {
            let user = doc.data();
            //Get all transactions for this user
            let transactionsSnapshot = await db.collection("guests").doc(guest_id).collection("transactions").get()
            if (!transactionsSnapshot.empty) {
                let transactions = []
                transactionsSnapshot.forEach(doc => {
                    let transaction = doc.data()
                    transactions.push(transaction)
                    console.log("transaction",transaction)
                })
                user.transactions = transactions
            }
            return res.status(200).json(user);
        }
        else{
            return res.status(400).json({"message":"User ID not found."});
        }
    } catch (error) {
        res.status(400).json({error:error});
    }
});

//Chef creating a new menu
app.post('/create_menu', async (req, res) => {
    const chef_id = req.body.chefID
    let menusID = req.body.menuID //If one is passed we are updating not adding
    const menu = req.body.menu

    //Example of expected format...
    const menu2 = {
          "description": "extravaganza of hot dogs",
          "courses": [
            {
              "course": "Appetizers",
              "items":  [{
                  "course": "Appetizers",
                  "description": "these are great",
                  "order": 1,
                  "title": "tacos",
                  "type": "item"
                },
                 {
                  "course": "Appetizers",
                  "description": "Olive Oil, Cracked Pepper",
                  "order": 2,
                  "title": "Burrata",
                  "type": "item"
                }
              ]
            },
             {
              "course": "Dessert",
              "items":  [
                 {
                  "course": "Dessert",
                  "description": "this is cake",
                  "order": 1,
                  "title": "cake part 2",
                  "type": "item"
                },
                 {
                  "course": "Dessert",
                  "order": 2,
                  "title": "Chocolate Cake",
                  "type": "item"
                }
              ]
            },
             {
              "course": "drinks",
              "items":  [
                 {
                  "course": "drinks",
                  "description": "have a beer",
                  "order": 1,
                  "title": "beers",
                  "type": "item"
                }
              ]
            }
          ],
          "title": "extravaganza of hot dogs"
        }
        

    const courses = _.pluck(menu.courses,'course')

    //IF a menu_id is present use that for updates else cerate new menu
    if(menusID){
        const menuDoc = await db.collection('chefs').doc(chef_id).collection('menus').doc(menusID).update({
            title: menu.title,
            description: menu.description,
            courses: courses
        })

        //DELTE EXISITNG SUBCOLLECTIONS (COURSES) BECAUSE WE'RE ADDING NEW ONES
        const collectionPath = `/chefs/${chef_id}/menus/${menusID}`
        const docRef = db.doc(collectionPath)
        const subcollections = await docRef.listCollections();
        for await (const subcollectionRef of subcollections) {
            const subcollectionPath = `${collectionPath}/${subcollectionRef.id}`
            console.log(subcollectionPath)
            await deleteCollection(db, subcollectionPath, 0)
        }
        
    }
    else{
        const menuDoc = await db.collection('chefs').doc(chef_id).collection('menus').add({
            title: menu.title,
            description: menu.description,
            courses: courses
        })
        menusID = menuDoc.id
    }

    for (const course of menu.courses) {
        let courseName = course.course
        let items = course.items
        //Create the course
        items.map(async (item,index) => {
            //console.log(item)
            //console.log(index)
            const res = await db.collection('chefs').doc(chef_id).collection('menus').doc(menusID).collection(courseName).add(item);
            console.log("RES SEULT",res)
        })
    }

    //WHY THIS??!?!?!?!
    //Add addtional details to menu 
    /*
    const update = await db.collection('chefs').doc(chef_id).collection('menus').doc(menusID).set({
        title: menu.title,
        description: menu.description,
        courses: courses
    })
    */

    return res.status(200).json({menuID:menusID});
});

//Submit a certification
app.post('/certification', async (req, res) => {
    try {
        let userID = req.body.uid
        let file = req.body.file
        let title = req.body.title

        const result = db.collection("chefs").doc(userID).update({
            //'certifications[title].is_submitted': true
            [`certifications.${title}.is_submitted`]: true,
            [`certifications.${title}.file`]: file
        });


        const approvalURL = `https://us-central1-elite-ee4b7.cloudfunctions.net/api/v1/accept/${userID}/${title}`
        const data = {
            from: 'EPC App <certifications@epcapp.com>',
            to: 'joe@cabdash.com,chefaustin@elitepersonalchefs.com ',
            subject: 'EPC App Notification',
            text: 'A new certification has been uploaded for your review: '+title+'\n\n'+file+'\n\n Approve this here: '+approvalURL
        }
        
        try {
            mailgun.messages().send(data, function (error, body) {
                res.status(200).send("All Set");
            });
        } catch (error) {
            return res.status(400).send({error:error});
        }


        res.status(200).send("All Set");
    }
    catch (error) {
        res.status(400).send("Something wrong"+error);
    }
});


//Approve certifications
app.get('/accept/:chefID/:certification', async (req, res) => {
    try {
        const chefID = req.params.chefID
        const certification = req.params.certification
        let key =  `certifications.${certification}.is_approved`
        await db.collection('chefs').doc(chefID).update({
            [key]: true
        })

        return res.status(200).send('All set');
    } catch (error) {
        res.status(400).send("Something wrong"+error);
    }
});


//Guests reserving a spot
app.post('/reserve', async (req, res) => {
    try {
        let guest_id = req.body.guest_id
        let guest_name = req.body.guest_name
        let experience_id = req.body.experience_id
        let experience_type = req.body.experience_type
        //Get the guest info
        const guestRef = db.collection("guests").doc(guest_id);
        const doc = await guestRef.get();
        if (doc.exists) {
            let guest = doc.data() 
            //Add the transaction to guest subcollection
            await guestRef.collection("transactions").add({
                experience_id:experience_id,
                experience_type:experience_type,
                payment_info:guest.payment_info,
                title:req.body.title,
                readable_date:req.body.readable_date

            });
            //Add guest to the experiece guest list subcllection
            await db.collection("experiences").doc(experience_id).collection("guest_list").add({guest_id:guest_id,guest_name:guest_name});
            return res.status(200).json({success:'done'});
        }

    }
    catch (error) {
        res.status(400).send("Something wrong"+error);
    }
});




app.post('/copy_event_template',async(req,res) => {    
    let eventTemplateID = req.body.event_template_id;    
    let addData = req.body.add_data;    
    try {
        const copies = await deepCopy('experience_templates', eventTemplateID, 'experiences', true, addData)        
        return res.status(200).json(copies)
    } catch (error) {
        res.status(400).send("Something wrong"+error);
    }
})

app.post('/copy_template',async(req,res) => {    
    let menuTemplateID = req.body.menu_template_id;    
    let userID = req.body.user_id;    
    let addData = req.body.add_data;    
    try {
        const copies = await deepCopy('menu_templates', menuTemplateID, 'chefs/'+userID+'/menus', true, addData)        
        return res.status(200).json(copies)
    } catch (error) {
        res.status(400).send("Something wrong"+error);
    }
})

/***********************************************************/
//DATABASE POPULATION - FOR DIAGNOSTICS AND SETUP
/***********************************************************/

async function createMenuTemplate(newMenu){
    let menuTemplateID
    let menuCollection = 'menu_templates2'
    const courseNameArray = _.keys(newMenu.courses)
    console.log("KEYS",courseNameArray)
    //Check if that menu template exists already
    const snapshot = await db.collection(menuCollection).where('title', '==', newMenu.title).limit(1).get()
    if (!snapshot.empty) {
        console.log("Template exists: updating")
        menuTemplateID = snapshot.docs[0].id;    
        await db.collection(menuCollection).doc(menuTemplateID).update({
            title: newMenu.title,
            description: newMenu.description,
            courses: courseNameArray
        })
        //Clear out former courses
        console.log("Clearing out courses")
        const collectionPath = `/${menuCollection}/${menuTemplateID}`
        const docRef = db.doc(collectionPath)
        const subcollections = await docRef.listCollections();
        for await (const subcollectionRef of subcollections) {
            const subcollectionPath = `${collectionPath}/${subcollectionRef.id}`
            console.log(subcollectionPath)
            await deleteCollection(db, subcollectionPath, 0)
        }
    }
    else{
        console.log("creating new template")
        const newMenuDoc = await db.collection(menuCollection).add({
            title: newMenu.title,
            description: newMenu.description,
            courses: courseNameArray
        })
        menuTemplateID = newMenuDoc.id
    }

    //Setup courses
    for (const courseName in newMenu.courses) {
        let courseDetail = newMenu.courses[courseName]
        console.log(courseDetail)
        let items = courseDetail.items
        //Create the course
        items.map(async (item,index) => {
            //console.log(item)
            //console.log(index)
            const res = await db.collection(menuCollection).doc(menuTemplateID).collection(courseName).add(item)
        })
    }
}

app.get('/menu-csv', async (req, res) => {
    let menuMaster = []
    let menu  = {}
    let currentCourse = null
    let orderCount = 1
    let currentCourseIndex = 0
    fs.createReadStream("./data/menu-template-3.csv")
        .pipe(csv.parse({ headers: false, ignoreEmpty: true }))
        .on('error', error => console.error(error))
        .on('data', row => {
            //Its a new temlpate add it to the main collection
            if(row[2] == ''){
                console.log(row)
                menu  = {}
                menuMaster.push(menu)
                menu.title = row[0]
                menu.description = row[1]
                menu.courses = []
                orderCount = 1
            }
            else{
                const courseName = row[2].toLowerCase()
                //Create the course if it hast been yet
                if(!_.has(menu.courses,courseName)){
                    menu.courses[courseName] = {
                        items: []
                    }
                    //currentCourseIndex = (_.size(menu.courses) - 1)
                }
                let itemDetail = {
                    course: courseName,
                    description:row[1],
                    order: orderCount,
                    title: row[0],
                    type: "item"
                }
                orderCount++
                menu.courses[courseName].items.push(itemDetail)
            }
        })
        .on('end', async rowCount => {
            console.log(util.inspect(menuMaster, {showHidden: false, depth: null, colors: true}))
            //let smallBatch = _.first(menuMaster,6)
            for await (const menu of menuMaster) {
                console.log("CREATING MENU+++++++++++")
                createMenuTemplate(menu)
            }
            return res.status(200).send("done");
        });
});






async function createEventTemplate(newEvent){
    let eventTemplateCollection = 'experience_templates'
    const trimDesc = newEvent.description.split('See the full') //remove the "see the full menu..." copy that was from the old sites
    const snapshot = await db.collection('menu_templates').where('title', '==', newEvent.menu_template).limit(1).get()
    if (!snapshot.empty) {
        menuTemplateID = snapshot.docs[0].id
        //Check if that event template exists already
        const snapshot2 = await db.collection(eventTemplateCollection).where('title', '==', newEvent.title).limit(1).get()
        if (!snapshot2.empty) {
            console.log("Template exists: updating")
            eventTemplateID = snapshot2.docs[0].id;    
            await db.collection(eventTemplateCollection).doc(eventTemplateID).update({
                title: newEvent.title,
                description: trimDesc[0],
                menu_template_id: menuTemplateID,
                cpp:newEvent.price
            })
        }
        else{
            console.log("creating new template")
            await db.collection(eventTemplateCollection).add({
                title: newEvent.title,
                description: trimDesc[0],
                menu_template_id: menuTemplateID,
                cpp:newEvent.price
            })
        }
    }  
    else{
        console.log("no associated menu template found")
    }
}

app.get('/event-csv', async (req, res) => {
    let eventMaster = []
    fs.createReadStream("./data/events5.csv")
        .pipe(csv.parse({ headers: false, ignoreEmpty: true }))
        .on('error', error => console.error(error))
        .on('data', row => {
                console.log(row)
                menu  = {}
                menu.title = row[0]
                menu.description = row[1]
                menu.menu_template = row[2]
                menu.price = row[3]
                eventMaster.push(menu)
           
        })
        .on('end', async rowCount => {
            console.log(util.inspect(eventMaster, {showHidden: false, depth: null, colors: true}))
            //let smallBatch = _.first(menuMaster,6)
            for await (const menu of eventMaster) {
                console.log("CREATING EVENT+++++++++++")
                createEventTemplate(menu)
            }
            return res.status(200).send("done");
        });
});




app.get('/create-chef', async (req, res) => {
    try {
        const user = await getPeople();
        const chef = user.results[0]
        const userData = {
            first_name: chef.name.first,
            last_name: chef.name.last,
            bio: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Fusce imperdiet sagittis euismod. Fusce mattis faucibus lacinia. In tempor ligula enim, non tincidunt orci',
            email: chef.email,
            phone: chef.phone,
            password: chef.login.md5,
            registered: chef.registered.date, 
            created_at: admin.firestore.FieldValue.serverTimestamp(),
            avatar:{
                img: chef.picture.large
            }
        }
        await db.collection("chefs").add(userData);
        return res.status(400).send("done");
    }
    catch (error) {
        res.status(400).send("Something wrong"+error);
    }
});


app.get('/create-random-person', async (req, res) => {
    try {
        const user = await getPeople();
        console.log("person",user)
        return res.status(200).json({"new person":user.results});
    }
    catch (error) {
        res.status(400).send("Something wrong"+error);
    }
});



app.get('/copy-collection',async(req,res) => {        
    try {
        const copies = await copyCollection('menu_templates/KyWOQvlZWgG3rNdd62yY/menu_items/D2IvFROqi5X14H5Lj1bM/Sweet Course', 'menu_templates/KyWOQvlZWgG3rNdd62yY/Sweet Course')        
        return res.status(200).json(copies)
    } catch (error) {
        res.status(400).send("Something wrong"+error);
    }
})


app.get('/deepcopy',async(req,res) => {        
    try {
        const copies = await deepCopy('menu_templates', 'KyWOQvlZWgG3rNdd62yY', 'chefs/Usbl6VbX68hVhAFB33WnoPk2Nuv1/menus', true)        
        return res.status(200).json(copies)
    } catch (error) {
        res.status(400).send("Something wrong"+error);
    }
})

/***********************************************************/
//HELPERS
/***********************************************************/

//Rename or copy a collection - DOESNT INCKUDE SUBCOLLECTIOBN
async function copyCollection(srcCollectionName, destCollectionName) {
    const documents = await db.collection(srcCollectionName).get();
    let writeBatch = db.batch();
    const destCollection = db.collection(destCollectionName);
    let i = 0;
    console.log(documents)
    for (const doc of documents.docs) {
        console.log(doc.id)
        writeBatch.set(destCollection.doc(doc.id), doc.data());
        i++;
        if (i > 400) {  // write batch only allows maximum 500 writes per batch
            i = 0;
            console.log('Intermediate committing of batch operation');
            await writeBatch.commit();
            writeBatch = db.batch();
        }
    }
    if (i > 0) {
        const batchResult = await writeBatch.commit();
        console.log(batchResult)
        console.log('Firebase batch operation completed. Doing final committing of batch operation.');
    } else {
        console.log('Firebase batch operation completed.');
    }
}

//Copies the subcollections of a collection
async function deepCopy(collectionFrom, docId, collectionTo, recursive = false, addData = {}) {
    // document reference
    const docRef = db.doc(collectionFrom+'/'+docId);
  
    // copy the document
    const docData = await docRef
      .get()
      .then((doc) => doc.exists && doc.data())
      .catch((error) => {
        console.error('Error reading document', `${collectionFrom}/${docId}`, JSON.stringify(error));
        throw new functions.https.HttpsError('not-found', 'Copying document was not read');
      });
  
    if (docData) {
      // document exists, create the new item
      /* Joe edit - creating a res var and using the res.id later plus using ".add()" instead of ".set()"
       will ensure each deep copy gets its own uniuqe ID */
      const res = await db
        .collection(collectionTo)
        .doc(docId)
        .set({ ...docData, ...addData })
        //.add({ ...docData, ...addData })
        .catch((error) => {
          console.error('Error creating document', `${collectionTo}/${docId}`, JSON.stringify(error));
          throw new functions.https.HttpsError(
            'data-loss',
            'Data was not copied properly to the target collection, please try again.',
          );
        });
  
      // if copying of the subcollections is needed
      if (recursive) {
        // subcollections
        const subcollections = await docRef.listCollections();
        for await (const subcollectionRef of subcollections) {
          const subcollectionPath = `${collectionFrom}/${docId}/${subcollectionRef.id}`;
  
          // get all the documents in the collection
          return await subcollectionRef
            .get()
            .then(async (snapshot) => {
              const docs = snapshot.docs;
              for await (const doc of docs) {
                await deepCopy(subcollectionPath, doc.id, `${collectionTo}/${docId}/${subcollectionRef.id}`, true);
              }
              return true;
            })
            .catch((error) => {
              console.error('Error reading subcollection', subcollectionPath, JSON.stringify(error));
              throw new functions.https.HttpsError(
                'data-loss',
                'Data was not copied properly to the target collection, please try again.',
              );
            });
        }
      }
      return true;
    }
    return false;
};

async function getPeople(){
    try {
        const headers = {
            'content-type' : 'application/json',
            'Accept': 'application/json',
            //'Toast-Restaurant-External-ID': (payload.externalGUID) ? payload.externalGUID : externalGUID,
            //'Authorization': (payload.isTokenRequest) ? '' : 'Bearer '+token
        }

        console.log("headers",headers)

        const response = await fetch('https://randomuser.me/api/?nat=us', {
            method: 'GET',
            headers: headers,
            //body: (payload.postData) ? JSON.stringify(payload.postData) : null
        })

        console.log(response)
        const json = await response.json()
        return json
    } 
    catch (error) {
        console.log("error",error)
        return {errors:errors}    
    }
}

/***********************************************************/
//EXPORT EXPRESS FUNCTION
/***********************************************************/

// "api" should match name of function in firebase.json rewrite rules
exports.api = functions.https.onRequest(main); 