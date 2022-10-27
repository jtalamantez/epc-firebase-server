
// Import Libraries 
const _ = require('underscore')

/****************************************************/
//FIREBASE SETUP
/****************************************************/
const admin = require('firebase-admin')
const db = admin.firestore()

/***********************************************************/
//HELPER FUNCTIONS
/***********************************************************/
async function searchForUserBy(field,searchkey){
    var searchkey = searchkey.trim()
    var snapshot
    if(field == 'name'){
        console.log("Search for user by name: "+searchkey)
        //snapshot =  await db.collection("users").orderBy('name').startAt("Joseph").endAt(["Joseph" + '\uf8ff']).get()
        snapshot =  await db.collection("users").where('searchable.name', ">=", searchkey.toLowerCase()).where('searchable.name', "<=", searchkey.toLowerCase()+"z").get()
        if(snapshot.empty){
            snapshot =  await db.collection("users").where('searchable.last_name', ">=", searchkey.toLowerCase()).where('searchable.last_name', "<=", searchkey.toLowerCase()+"z").get()
        }
        if(snapshot.empty){
            snapshot =  await db.collection("users").where('searchable.first_name', ">=", searchkey.toLowerCase()).where('searchable.first_name', "<=", searchkey.toLowerCase()+"z").get()
        }
    }
    else{
        snapshot =  await db.collection("users").where(field, '==', searchBy).get()
    }
    if (!snapshot.empty) {
        let docs = snapshot.docs;
        let docInfo = ''
        let accounts = []
        snapshot.forEach(doc => {
            docInfo += JSON.stringify(doc.data())
            let fbUser = doc.data()
            let user = getUserAccountInfo(fbUser)
            accounts.push(user)
        })
        console.log("accounts",accounts)
        return accounts
    }
    return null
}

async function getUserByID(id,idType = "short_id"){
    //Get the users account ref - check if its a firendly ID or GUID from firebase
    const idLength = id.length
    const snapshot = await db.collection('users').where(idType, '==', String(id)).limit(1).get();
    if (!snapshot.empty) {
        id = snapshot.docs[0].id;    
        console.log("Found ID",id)       
    }  
    else{
        console.log("snap shot empty")
    }
    return db.collection("users").doc(id);    
}


function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}


//EXPORT ROUTES
module.exports = { searchForUserBy, getUserByID, capitalizeFirstLetter}