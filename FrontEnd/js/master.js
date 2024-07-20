// our socket
let ws = null;

// it will be like 
// FriendsWithChats[friendId:String] = {userName:String ,messages:[{fromMe: Bool, content: String}],fetched:Bool}
let FriendsWithChats = new Map();

// it will be like 
// OnlinePeople[onlinePerson:String] = personName:String
let OnlinePeople = new Map();

// Just have IDS
let BlockedPeopleByMe = new Set();
let BlockedByPeople = new Set();

// my API URL
const MY_URL = 'https://chatme-production-41f5.up.railway.app/';

// for better UI
const avatarColors = ['#726eff','#08c6ab','#607d8b','#ff0f0f','#c608a2','#9c27b0','#973e1b','#5f5d97','#ca1515','#f44336','#e91e63','#ff5722','#673ab7','#00cf09'];

// helper functions and attrs

/**
 * 
 * @param {string} elementName
 * @param {string} className 
 * @param {string} textContent 
 * @param  {...Node} nodes 
 * @returns 
 */
function CreateElement(elementName='div',className='',textContent='') {
    let element = document.createElement(`${elementName}`);
    element.classList = className;
    element.textContent = textContent;
    return element;
}
let typingTime = 1;

// create a friend or a person with online sign or without it
function createFriend(userName,userId) {
    let contactName = CreateElement('div','contact-name',userName)
    let avatar = CreateElement('div','avatar',String(userName[0]).toUpperCase());
    avatar.style.backgroundColor = avatarColors[userName.charCodeAt(0) % avatarColors.length];
    if (OnlinePeople.has(userId)) {
        let greenBall = CreateElement('div','green-ball');
        avatar.appendChild(greenBall);
    }
    let friendContact = CreateElement('div','contact','');
    friendContact.appendChild(avatar);
    friendContact.appendChild(contactName);
    friendContact.id =userId;
    return friendContact;
}

function addClass(node,className) {
    if (node.classList.contains(className)) 
        return;
    node.classList.add(className);
}

function deleteClass(node,className) {
    node.classList.remove(className);
}

function showOrHideChatScreen(show) {
    if (show) {
        deleteClass(currentContact,hidden);
        deleteClass(chatScreen,hidden);
        deleteClass(chatBar,hidden);
        addClass(blanckScreen,hidden);
    }
    else {
        addClass(currentContact,hidden);
        addClass(chatScreen,hidden);
        addClass(chatBar,hidden);
        deleteClass(blanckScreen,hidden);
    }
}

function updatePersonStatus(person) {
    let avatar = person.querySelector('.avatar');
    if (!OnlinePeople.has(person.id)) {
        avatar.querySelector('.green-ball')?.remove();
    }
    else {
        let greenBall = document.createElement('div');
        addClass(greenBall,'green-ball');
        avatar.appendChild(greenBall);
    }
}
function loading(node) {
    node.innerHTML = ''; 
    let loader = CreateElement('div','loader');
    loader.append(CreateElement('span'),CreateElement('span'),CreateElement('span'));
    node.appendChild(loader);
}

// global classes
const hidden = 'hidden';
const faint = 'faint';
const clickedContact = 'clicked-contact';

// connect to a socket and reconnect if something goes wrong 
function createSocket() {
    ws = new WebSocket('ws://localhost:8080');
    ws.addEventListener('message',handleMessage);
    ws.addEventListener('close',(ev)=>createSocket());
}

// fetch all my Friends to append it to contacts
async function fetchMyFriends() {
    try {
        let {contacts} = await (await fetch(MY_URL+'userOp/friends',{credentials:'include'})).json();
        for (let idx = 0; idx < contacts.length; idx++) {
            FriendsWithChats.set(contacts[idx].userId.toString() ,{userName:contacts[idx].userName,messages:[],fetched:false});
        }
    }
    catch(err){
        throw 'There is an issue with getting your friends refresh the page!'
    }
}

// get user name from localStorage
function getUserName() {
    let activeUser = document.querySelector('.active-user');
    activeUser.textContent = localStorage.getItem('userName') + ' |';
}

async function fetchMyBlockedAndBlockedBy() {
    let res = await fetch(MY_URL+'userOp/blockedAndBlockedBy',{credentials:'include'});
    if (res.status >= 400) {
        throw 'There is with getting blocked people and blocked by people refresh the page!';
    }
    let {blockedByPeople,blockedPeopleByMe} = await res.json();
    BlockedByPeople = new Set(blockedByPeople);
    BlockedPeopleByMe = new Set(blockedPeopleByMe);
}

async function preparationForUser() {
    loading(document.querySelector('.contacts'));
    getUserName();
    await fetchMyFriends();
    await fetchMyBlockedAndBlockedBy();
    showContacts(true);
}

// The start from here
async function RUN() {
    // render the landing page if i don't have token and main page otherwise
    let landingPage = document.querySelector('.landingContiner');
    let mainPage = document.querySelector('.main');
    if (localStorage.getItem('token')) {
        addClass(landingPage,hidden);
        deleteClass(mainPage,hidden);
        await preparationForUser();
        createSocket();
    }
    else {
        addClass(mainPage,hidden);
        deleteClass(landingPage,hidden);
    }
}
// Start Landing *

RUN();

/////////////////////////
let signUpPage = document.querySelector('.signUpPage');
let logInPage = document.querySelector('.logInPage');
let signUpButton = document.querySelector('.signUpButton');
let logInButton = document.querySelector('.logInButton');
let logInForm = document.querySelector('.logInPage form');
let signUpForm = document.querySelector('.signUpPage form');


// for swapping between the tow buttons
logInButton.addEventListener('click',(event)=> {
    deleteClass(logInPage,hidden);
    deleteClass(logInButton,faint);
    addClass(signUpPage,hidden);
    addClass(signUpButton,faint);
});
signUpButton.addEventListener('click',(event)=> {
    deleteClass(signUpPage,hidden);
    deleteClass(signUpButton,faint);
    addClass(logInPage,hidden);
    addClass(logInButton,faint);
});

// all signUp and logIn functionality

signUpForm.addEventListener('submit',(event)=> {
    event.preventDefault();
    fetch(MY_URL+'auth/signup',{method:'post',credentials:'include',headers:{
        'Content-Type':'application/json',
    },body: JSON.stringify({
        email:document.querySelector('.signUpPage .email').value,
        userName:document.querySelector('.signUpPage .name').value,
        password:document.querySelector('.signUpPage .password').value,
    })}).then((result)=>dealWithResultFromSignAndLog(result,true));
});

logInForm.addEventListener('submit',(event)=> {
    event.preventDefault();
    fetch(MY_URL+'auth/login',{method:'post',credentials:'include',headers:{
        'Content-Type':'application/json',
    },body: JSON.stringify({
        email:document.querySelector('.logInPage .email').value,
        password:document.querySelector('.logInPage .password').value,
    })}).then((result)=>dealWithResultFromSignAndLog(result,false));
});

async function dealWithResultFromSignAndLog(result,signUp)  {
    let finRes = await result.json();
    if (result.status >= 400) {
        let err = document.querySelector('.error');
        if(!err) {
            err = document.createElement('div');
        }
        err.textContent = finRes.message;
        err.classList.add('error');
        if (signUp) {
            signUpForm.appendChild(err);
        }
        else {
            logInForm.appendChild(err);
        }
    }
    else {
        if (signUp)
            localStorage.setItem('userName',document.querySelector('.signUpPage .name').value );
        else 
            localStorage.setItem('userName',finRes.userName);
        localStorage.setItem('token',finRes.token);
        localStorage.setItem('userId',finRes.userId);
        location.reload();
    }
}

// End Landing *
/////////////////////////
let currentSelectedUserId = null;

let logOutButton = document.querySelector('.logOutButton');
let contacts = document.querySelector('.contacts');
let messageBtn = document.querySelector('.messageBtn');
let messageInput = document.querySelector('.chat-bar input')
let chatScreen = document.querySelector('.chat-screen');
let chat = document.querySelector('.chat');
let currentContact = document.querySelector('.current-contact');
let blockButton = document.querySelector('.block-btn');
let chatBar = document.querySelector('.chat-bar');
let blanckScreen = document.querySelector('.blanck-screen');


let searchInput = document.querySelector('.search-input');
let searchButton = document.querySelector('.search-btn');

let myFriendsButton = document.querySelector('.friends-p');
let onlineButton = document.querySelector('.online-p');
let onlineCount = document.querySelector('.online-count');
// for mobile
let arrow = document.querySelector('.arrow');
let sideBar = document.querySelector('.side-bar');

arrow.addEventListener('click',(event)=> {
    deleteClass(arrow,hidden);
    if (arrow.textContent == '>') {
        sideBar.style.cssText = 'display:block';
        chat.style.cssText = 'width:50%'
        arrow.textContent = '<';
    }
    else if(arrow.textContent =='<') {
        arrow.textContent = '>';
        sideBar.style.cssText = 'display:none';
        chat.style.cssText = 'width:100%';
    }
    else throw "Don't Touch The Html *_*";
})


// simple log out clear my token and userId from localStorage and close the ws and reload the page
logOutButton.addEventListener('click',(event)=> {
    localStorage.clear();
    ws.close();
    location.reload();
})

// simply it just sends a message from me to my friend and append the message to my chat screen
function sendMessage() {
    if (String(messageInput.value).trim()) {
        let message = CreateElement('div','message',messageInput.value);
        let messageFromMe = CreateElement('div','from-me','');
        messageFromMe.appendChild(message);
        messageInput.value = '';
        FriendsWithChats.get(currentSelectedUserId).messages.push({fromMe:true,content:message.textContent});
        chatScreen.appendChild(messageFromMe);
        chatScreen.scrollTo(0,chatScreen.scrollHeight);
        ws.send(JSON.stringify({
            sendedMessage: {
                to:currentSelectedUserId,
                content:message.textContent
            }
        }))
    }
}

messageBtn.addEventListener('click',(event)=> {
    sendMessage();
});

// for UX
messageBtn.addEventListener('keydown',(event)=> {
    if (event.keyCode === 9) {
        event.preventDefault();
        messageInput.focus();
    }
})
messageInput.addEventListener('keydown',(event)=> {
    if (event.keyCode === 13 || event.key === 'Enter') {
        sendMessage();
    }
})


messageInput.addEventListener('input',(event)=>{
    if (OnlinePeople.has(currentSelectedUserId) && typingTime == 1) {
        ws.send(JSON.stringify({typing:{to:currentSelectedUserId}}));
        typingTime = 0;
        setTimeout(()=>{typingTime = 1},4000);
    }
});

// Show messages from a specific person
function showMessages(index) {
    chatScreen.innerHTML = '';
    let messages = FriendsWithChats.get(index).messages;
    for (let idx = 0; idx < messages.length; idx++) {
        let message = CreateElement('div','message',messages[idx].content);
        let messageCont = CreateElement('div',(messages[idx].fromMe ? 'from-me':'to-me'),'');
        messageCont.appendChild(message);
        chatScreen.appendChild(messageCont);
    }
    chatScreen.scrollTo(0,chatScreen.scrollHeight);
}
//

// Show and Search Contact(s) And its functionality

// selection between MyFriends and Online People
myFriendsButton.addEventListener('click',()=>
    {
        addClass(myFriendsButton,'active');
        deleteClass(onlineButton,'active');
        showContacts(true);
    }
);
onlineButton.addEventListener('click',()=>
    {
        addClass(onlineButton,'active');
        deleteClass(myFriendsButton,'active');
        showContacts(false);
    }
);

async function unBlockPerson(person) {
    let res = await fetch(MY_URL+'userOp/unBlockPerson',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({
        userName:localStorage.getItem('userName'),
        personId:person.id
    })});
    if (res.status >= 400) {
        throw 'There is an issue with the server!';
    }
    let unBlockedPerson = document.getElementById(person.id);
    if (unBlockedPerson) {
        unBlockedPerson.querySelector('.un-block').remove();
        let personName = person.querySelector('.contact-name').textContent;
        FriendsWithChats.set(person.id,{userName:personName,messages:[],fetched:false});
        BlockedPeopleByMe.delete(person.id);
        addClickEventForGetMessages(unBlockedPerson);
    }
}

function showContacts(areFriends) {
    contacts.innerHTML = '';
    // the (value) of FriendsWithChats will be like {userName:String,messages:[{...}],fetched:Bool}
    // the (value) of OnlinePeople will be userName:String
    (areFriends ? FriendsWithChats : OnlinePeople).forEach((value,key)=> {
        let friend = null;
        if (!areFriends) {
            friend = createFriend(value,key);
            if (FriendsWithChats.has(key)) {            
                addClickEventForGetMessages(friend);
            }
            else if (BlockedByPeople.has(key)) {
                let blockedSent = CreateElement('div','blocked-sent','Blocked');
                friend.querySelector('.contact-name').appendChild(blockedSent);
            }
            else if (BlockedPeopleByMe.has(key)) {
                let unBlock = CreateElement('div','un-block','UnBlock');
                unBlock.addEventListener('click',()=>unBlockPerson(friend));
                friend.querySelector('.contact-name').appendChild(unBlock);
            }
            else {
                let addButton = CreateElement('div','add-to-me','+Add');
                addButton.addEventListener('click',()=>addToMyFriendEvent(key,value));
                friend.querySelector('.contact-name').appendChild(addButton);
            }
        }
        else {
            friend = createFriend(value.userName,key);
            addClickEventForGetMessages(friend);
        }
        if (friend) {
            if (OnlinePeople.has(key)) 
                contacts.insertBefore(friend,contacts.firstElementChild);
            else 
                contacts.appendChild(friend);
        }
    });

    // for better UX
    if (currentSelectedUserId) {
        let selectedUser = document.getElementById(currentSelectedUserId);
        if (selectedUser) {
            addClass(selectedUser,clickedContact);
        }
    }
}

document.querySelector('.block-btn').addEventListener('click',async (event)=> {
    let userId = document.querySelector('.block-btn').parentNode.id;
    if (!userId)
        throw "There is an issue with getting userId!";

    let res = await fetch(MY_URL+'userOp/blockPerson',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body: JSON.stringify(
    {
        personId:userId
    }
    )});

    if (res.status >= 400) {
        throw "There is an issue";
    }
    FriendsWithChats.delete(userId);
    BlockedPeopleByMe.add(userId);
    currentContact.id = '';
    currentSelectedUserId = null;
    showOrHideChatScreen(false);
    if (myFriendsButton.classList.contains('active')) 
        showContacts(true);
    else 
        showContacts(false);
});

async function fetchMessages(personId) {
    let res = await fetch(MY_URL+'messages/'+personId,{credentials:'include'});
    if (res.status >= 400) {
        throw "There is an error in fetch messages";
    }
    let data = await res.json();
    for (let idx = 0; idx < data.length; idx++) {
        let {text,from} = data[idx];
        FriendsWithChats.get(personId).messages.push(
            {
                fromMe: (from==localStorage.getItem('userId') ? true : false),
                content:text
            }
        )
    }
    FriendsWithChats.get(personId).fetched = true;
}

function addClickEventForGetMessages(node) {
    node.addEventListener('click',async (event)=> {
        if (node.id == currentSelectedUserId)
            return;
        // remove the clicked background from all the contacts
        document.querySelectorAll('.contact').forEach(cont=>deleteClass(cont,clickedContact));
        let userName = node.querySelector('.contact-name').textContent;

        // add it to the one which i clicked it
        addClass(node,clickedContact);
        currentSelectedUserId = node.id;

        showOrHideChatScreen(true);

        // for the upper bar for the current user
        currentContact.id = node.id;
        currentContact.querySelector('.contact-name').textContent = userName;
        currentContact.querySelector('.avatar').textContent = String(userName[0]).toUpperCase();
        currentContact.querySelector('.avatar').style.backgroundColor = avatarColors[userName.charCodeAt(0) % avatarColors.length];
        updatePersonStatus(currentContact);

        // for mobile for more UX
        if (!arrow.classList.contains(hidden)) {
            arrow.textContent = '>';
            sideBar.style.cssText = 'display:none';
            chat.style.cssText = 'width:100%';
        }

        // fetch the messages between me and this friend and put them to FriendsWithChats if we didn't fetch them yet 
        if (!FriendsWithChats.get(currentSelectedUserId).fetched) {
            loading(chatScreen);
            await fetchMessages(currentSelectedUserId);
        }
        // show the messages between me and this friend
        showMessages(currentSelectedUserId);
    });
}

// this event for the Add button in either searched person or Online people
async function addToMyFriendEvent(friendId,friendName) {
    let res = await fetch(MY_URL+'userOp/addFriend',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({
        friendId:friendId,userName:localStorage.getItem('userName')})});
    if (res.status >= 400) {
        contacts.innerHTML = '';
        let err = CreateElement('div','error','There is an error occured Try Again');
        contacts.appendChild(err);
    }
    else {
        FriendsWithChats.set(friendId,{userName:friendName,messages:[],fetched:false});
        addClass(myFriendsButton,'active');
        deleteClass(onlineButton,'active');
        showContacts(true);
    }
}

searchButton.addEventListener('click',async (event)=> {
    if (String(searchInput.value).trim() && String(searchInput.value).trim() != localStorage.getItem('userName')) {
        loading(contacts);
        let result = await fetch(MY_URL+'userOp/friend/'+searchInput.value,{credentials:'include'});
        deleteClass(myFriendsButton,'active');
        deleteClass(onlineButton,'active');
        searchInput.value = '';
        if(result.status != 200 && result.status != 201) {
            contacts.innerHTML = '';
            let err = CreateElement('div','error','There is no name Such That');
            contacts.appendChild(err);
        }
        else {
            // remove all stuff from contacts to show the fetched person
            contacts.innerHTML = '';
            let {userId,userName} = await result.json();

            let friendContact = createFriend(userName,userId);
            // if the fetched person isn't in my Friends so i will add the adding functionality to it
            if (!FriendsWithChats.has(userId)) {
                if (BlockedByPeople.has(userId)) {
                    let blockedSent = CreateElement('div','blocked-sent','Blocked');
                    friendContact.querySelector('.contact-name').appendChild(blockedSent);
                }
                else if (BlockedPeopleByMe.has(userId)) {
                    let unBlock = CreateElement('div','un-block','UnBlock');
                    unBlock.addEventListener('click',()=>unBlockPerson(friendContact));
                    friendContact.querySelector('.contact-name').appendChild(unBlock);
                }
                else {
                    let addToMyFriendsBtn = CreateElement('div','add-to-me','+Add');
                    addToMyFriendsBtn.addEventListener('click',()=>addToMyFriendEvent(userId,userName));
                    friendContact.querySelector('.contact-name').appendChild(addToMyFriendsBtn);
                }
            }
            // otherwise he will be my Friend and i will add the addClickEvent to it 
            else {
                addClickEventForGetMessages(friendContact);
                // for better UX
                if (currentSelectedUserId == userId) {
                    addClass(friendContact,clickedContact);
                }
            }
            contacts.appendChild(friendContact);
        }
    }
});
//

// web Socket and all functionality

function handleMessage(event) {
    let data = JSON.parse(event.data);
    // recive a user or users
    if ('online' in data) {
        addOnlinePeople(data.online);
    }

    // recive a user
    else if ('offline' in data) {
        let {userId} = data.offline;
        extractOfflinePerson(userId);
    }

    else if('incommingMessage' in data){
        const {from,content} = data.incommingMessage;
        reciveMessage(from,content);
    }
    else if ('typing' in data) {
        const {from} = data.typing;
        typingEvent(from);
    }

    else if('newFriend' in data) {
        let {userName,userId} = data.newFriend;
        newFriendCome(userName,userId);
    }

    else if ('blockedBy' in data) {
        let {userId} = data.blockedBy;
        blockByPerson(userId);
    }
    else if ('unBlockBy' in data) {
        let {userName,userId} = data.unBlockBy;
        unBlockBy(userName,userId);
    }
}

// adding the people to my OnlinePeople Map and Check if there are online people in my Friends
function addOnlinePeople(people) {
    for (const person of people) {
        OnlinePeople.set(person.userId,person.userName);
        let friend;
        if (onlineButton.classList.contains('active')) {
            friend = createFriend(person.userName,person.userId);
            contacts.appendChild(friend);
        }
        // either MyFriends button clicked or we are searching for a person
        // this will deal with these tow conditions
        else {
            friend = document.getElementById(person.userId);
        }

        if (friend)
            updatePersonStatus(friend);
    }
    // if we select any friend update his status
    if (OnlinePeople.has(currentContact.id))
        updatePersonStatus(currentContact);
    onlineCount.textContent = OnlinePeople.size;
}

// there should be just one person to delete it from OnlinePeople and remove the online (green)ball from him
function extractOfflinePerson(personId) {
    // just update my OnlinePeople Map and The count of Online People
    OnlinePeople.delete(personId);
    onlineCount.textContent = OnlinePeople.size;

    if (onlineButton.classList.contains('active')) {
        let friend = document.getElementById(personId);
        if (friend)
            friend.remove();
    }
    // either MyFriends button clicked or we are searching for a person
    // this will deal with these tow conditions
    else {
        let friend = document.getElementById(personId);
        if (friend)
            updatePersonStatus(friend);
    }

    if (currentContact.id == personId) 
        updatePersonStatus(currentContact);

}

function newFriendCome(userName,userId) {
    FriendsWithChats.set(userId,{userName:userName,messages:[],fetched:false});
    if (myFriendsButton.classList.contains('active')) {
        let friend = createFriend(userName,userId);
        addClickEventForGetMessages(friend);
        contacts.insertBefore(friend,contacts.firstElementChild);
    }
    else {
        let friend = document.getElementById(userId);
        if (friend) {
            friend.remove();
            let nFriend = createFriend(userName,userId);
            addClickEventForGetMessages(nFriend);
            contacts.insertBefore(nFriend,contacts.firstElementChild);
        }
    }
}

function reciveMessage(from,content) {
    if (!FriendsWithChats.has(from)) {
        throw "The sender is not in your Friends!";
    }
    // if the current selected user the same as the sender(from) so append the message 
    // immediately and put it in the messages from this friend
    if (from == currentSelectedUserId) {
        let message = CreateElement('div','message',content);
        let messageToMe = CreateElement('div','to-me','');
        messageToMe.appendChild(message);
        chatScreen.appendChild(messageToMe);
        // for every message scroll to it
        chatScreen.scrollTo(0,chatScreen.scrollHeight);
        FriendsWithChats.get(from).messages.push({fromMe:false,content:content});
    }
    
    // if i have fetched the messages from this person then i will push it to messages from this friend
    // otherwise there will be a corruption
    else if(FriendsWithChats.get(from).fetched) {
        FriendsWithChats.get(from).messages.push({fromMe:false,content:content});
    }
}

// block by a person
function blockByPerson(personId) {
    if (!FriendsWithChats.has(personId)) {
        throw "the person is not your friend!";
    }

    FriendsWithChats.delete(personId);
    BlockedByPeople.add(personId);
    if (currentSelectedUserId == personId) {
        currentContact.id = "";
        currentSelectedUserId = null;
        showOrHideChatScreen(false);
    }
    let block = document.getElementById(personId);
    if (block) {
        deleteClass(block,clickedContact);
        block.remove();
        if (!myFriendsButton.classList.contains('active')) {
            let blockBy = createFriend(OnlinePeople.get(personId),personId);
            let blockedSent = CreateElement('div','blocked-sent','Blocked');
            blockBy.querySelector('.contact-name').appendChild(blockedSent);
            contacts.appendChild(blockBy);
        }
    }
}

function typingEvent(userId) {
    let friend = document.getElementById(userId);
    if (friend) {
        if (!friend.querySelector('.typing')) {
            let typing = CreateElement('div','typing','typing');
            typing.append(CreateElement('span'),CreateElement('span'),CreateElement('span'));
            if (currentSelectedUserId == userId)
                currentContact.querySelector('.contact-name').appendChild(typing.cloneNode(true));
            friend.querySelector('.contact-name').appendChild(typing);
            setTimeout(()=>{friend.querySelector('.typing')?.remove();currentContact.querySelector('.typing')?.remove();},4000);
        }
    }
}

function unBlockBy(userName,userId) {
    if (!BlockedByPeople.has(userId)) {
        throw "There is an error in blocked by people";
    }
    FriendsWithChats.set(userId,{userName:userName,messages:[],fetched:false});
    BlockedByPeople.delete(userId);
    let nFriend;
    if (myFriendsButton.classList.contains('active')) {
        nFriend = createFriend(userName,userId);
        contacts.appendChild(nFriend);
    }
    else {
        nFriend = document.getElementById(userId);
        if (nFriend)
            nFriend.querySelector('.blocked-sent').remove();
    }
    if (nFriend)
        addClickEventForGetMessages(nFriend);
}
//