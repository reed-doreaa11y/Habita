import { initializeApp } from "firebase/app";
import * as authSdk from "firebase/auth";
import * as firestoreSdk from "firebase/firestore";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";
import { getAI, getGenerativeModel, GoogleAIBackend } from "firebase/ai";

window.habitaCloud=(function(){
  var app=null,auth=null,db=null,user=null,configured=false;
  var cfgKey="habita-firebase-config";
  // Habita's Firebase web-app configuration. This is safe to ship in a web app;
  // access control is enforced by Firebase Authentication + Firestore Security Rules.
  var DEFAULT_CONFIG={
    apiKey:"AIzaSyDu-hd06dbpBZmDbVzqOagi5vGuqXtfRdI",
    authDomain:"habita-2ccd9.firebaseapp.com",
    projectId:"habita-2ccd9",
    storageBucket:"habita-2ccd9.firebasestorage.app",
    messagingSenderId:"188542030107",
    appId:"1:188542030107:web:18a64413ae4e97e07ac3be"
  };
  async function ensure(){
    if(app)return;
    var cfg=DEFAULT_CONFIG;
    try{cfg=JSON.parse(localStorage.getItem(cfgKey)||"null")||DEFAULT_CONFIG}catch(e){cfg=DEFAULT_CONFIG}
    if(!cfg)throw new Error("Firebase is not configured yet.");
    app=initializeApp(cfg);
    // App Check must start before any Firebase AI Logic call. It stays off until a site key is set (see .env.example).
    var acKey=import.meta.env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY;
    if(acKey){try{initializeAppCheck(app,{provider:new ReCaptchaEnterpriseProvider(acKey),isTokenAutoRefreshEnabled:true})}catch(e){console.warn("Habita App Check",e)}}
    auth=authSdk.getAuth(app);db=firestoreSdk.getFirestore(app);configured=true;
    authSdk.onAuthStateChanged(auth,function(u){user=u; if(window.render)window.render()});
    window.habitaCloud._mods={auth:authSdk,fire:firestoreSdk};
  }
  async function configure(cfg){localStorage.setItem(cfgKey,JSON.stringify(cfg));app=null;auth=null;db=null;configured=false;await ensure();return true}
  async function googleLogin(){await ensure();var provider=new window.habitaCloud._mods.auth.GoogleAuthProvider();provider.setCustomParameters({prompt:"select_account"});var r=await window.habitaCloud._mods.auth.signInWithPopup(auth,provider);user=r.user;var remote=await syncNow(window.state);if(remote){window.state=remote;window.localStorage.setItem(window.KEY||"habita-v2",JSON.stringify(window.state));}else{await queueSave(window.state)}return user}
  async function signOut(){await ensure();await window.habitaCloud._mods.auth.signOut();user=null}
  async function syncNow(local){await ensure();if(!user)throw new Error("Sign in first.");var ref=window.habitaCloud._mods.fire.doc(db,"users",user.uid);var snap=await window.habitaCloud._mods.fire.getDoc(ref);if(snap.exists())return snap.data().state||null;await window.habitaCloud._mods.fire.setDoc(ref,{state:local||window.state,updatedAt:window.habitaCloud._mods.fire.serverTimestamp()});return local||window.state}
  var timer=null;
  async function queueSave(st){if(!user)return;clearTimeout(timer);timer=setTimeout(async function(){try{await ensure();if(!user)return;var ref=window.habitaCloud._mods.fire.doc(db,"users",user.uid);await window.habitaCloud._mods.fire.setDoc(ref,{state:st,updatedAt:window.habitaCloud._mods.fire.serverTimestamp()},{merge:true})}catch(e){console.warn("Habita cloud sync",e)}},900)}
  function status(){return{configured:!!(configured||localStorage.getItem(cfgKey)||DEFAULT_CONFIG),signedIn:!!user,email:user?user.email:""}}
  ensure().catch(function(){});
  return{configure:configure,googleLogin:googleLogin,signOut:signOut,syncNow:syncNow,queueSave:queueSave,status:status};
})();

// Firebase AI Logic is initialized lazily so the rest of Habita continues to work
// if AI setup is incomplete or the free-tier quota is unavailable.
window.habitaAI = (function(){
  var model = null;
  async function getModel(){
    if(model) return model;
    var status = window.habitaCloud.status();
    if(!status.configured) throw new Error("Firebase is not configured yet.");
    var cfg = JSON.parse(localStorage.getItem("habita-firebase-config") || "null") || null;
    // Use the same Firebase app initialized by the cloud module.
    var app = await (async function(){
      // initializeApp returns the default app once the cloud module has initialized.
      const { getApp } = await import("firebase/app");
      return getApp();
    })();
    var ai = getAI(app, { backend: new GoogleAIBackend() });
    model = getGenerativeModel(ai, { model: "gemini-2.5-flash" });
    return model;
  }
  async function ask(prompt){
    if(typeof prompt !== "string" || !prompt.trim()) throw new Error("Enter a prompt first.");
    if(prompt.length > 12000) throw new Error("This request is too long. Please shorten it.");
    var m = await getModel();
    var result = await m.generateContent(prompt);
    return result.response.text();
  }
  return { ask: ask };
})();

(function(){var y0=null;document.addEventListener("touchstart",function(e){var sh=e.target.closest&&e.target.closest(".sheet");y0=(sh&&e.target.tagName!=="TEXTAREA")?e.touches[0].clientY:null},{passive:true});document.addEventListener("touchend",function(e){if(y0===null||!plusOpen)return;var dy=e.changedTouches[0].clientY-y0;y0=null;if(dy>70){plusOpen=false;render()}},{passive:true})})();
