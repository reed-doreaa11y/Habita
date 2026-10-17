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
    if(acKey){try{initializeAppCheck(app,{provider:new ReCaptchaEnterpriseProvider(acKey),isTokenAutoRefreshEnabled:true})}catch(e){console.warn("Habita App Check initialization failed",e)}}else{console.warn("Habita App Check site key is missing. If App Check is enforced for Firebase AI Logic, AI requests will be rejected. Set VITE_RECAPTCHA_ENTERPRISE_SITE_KEY in the deployment environment and redeploy.")}
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
  return{ready:ensure,configure:configure,googleLogin:googleLogin,signOut:signOut,syncNow:syncNow,queueSave:queueSave,status:status};
})();

// Firebase AI Logic is initialized lazily so the rest of Habita continues to work
// if AI setup is incomplete or the free-tier quota is unavailable.
window.habitaAI = (function(){
  // Use currently supported Firebase AI Logic text models. Avoid Gemini 2.5 fallbacks because
  // these are being retired and may be unavailable to this project.
  var MODELS = ["gemini-3.8-flash", "gemini-3.5-flash-lite", "gemini-3.5-flash", "gemini-3.1-flash-lite"];
  var ai = null, models = {}, lastError = "", lastModel = "";
  async function getAi(){
    if(ai) return ai;
    var status = window.habitaCloud.status();
    if(!status.configured) throw new Error("Firebase is not configured yet.");
    await window.habitaCloud.ready();
    const { getApp } = await import("firebase/app");
    ai = getAI(getApp(), { backend: new GoogleAIBackend() });
    return ai;
  }
  function explain(e){
    var msg = String((e && e.message) || e || "Unknown error");
    if(/App Check|appcheck|token/i.test(msg)) return "Firebase App Check is blocking AI requests. Turn off enforcement for Firebase AI Logic in the Firebase console, or finish the App Check setup. (" + msg + ")";
    if(/API has not been used|not enabled|SERVICE_DISABLED|firebasevertexai|generativelanguage/i.test(msg)) return "The AI API isn't enabled for this Firebase project yet. Open Firebase console > AI Logic > Get started and choose Gemini Developer API. (" + msg + ")";
    if(/quota|429|RESOURCE_EXHAUSTED|rate/i.test(msg)) return "The free AI quota is used up for now. Try again later. (" + msg + ")";
    if(/API key|API_KEY|403|permission|PERMISSION_DENIED|referer|keyInvalid/i.test(msg)) return "Firebase rejected the request (permission/API key). Check that Firebase AI Logic is enabled and the API key is allowed to use the Firebase AI Logic API. (" + msg + ")";
    if(/network|failed to fetch|fetch failed|ERR_INTERNET_DISCONNECTED|timeout/i.test(msg)) return "Habita could not reach Firebase AI. Check your internet connection, then retry. (" + msg + ")";
    return msg;
  }
  async function ask(prompt){
    if(typeof prompt !== "string" || !prompt.trim()) throw new Error("Enter a prompt first.");
    if(prompt.length > 12000) throw new Error("This request is too long. Please shorten it.");
    var a = await getAi(), order = lastModel ? [lastModel].concat(MODELS.filter(function(x){return x !== lastModel})) : MODELS, err = null;
    for(var i = 0; i < order.length; i++){
      try{
        var name = order[i];
        var m = models[name] || (models[name] = getGenerativeModel(a, { model: name }));
        var result = await m.generateContent(prompt);
        lastModel = name; lastError = "";
        return result.response.text();
      }catch(e){
        err = e; lastError = explain(e);
        // Only move to the next model when this one looks unavailable; stop for quota/permission/App Check problems.
        if(!/not found|404|no longer available|not supported|unavailable for|limited to projects|NOT_FOUND|deprecated/i.test(String((e && e.message) || e))) break;
      }
    }
    throw new Error(lastError || explain(err));
  }
  // One tiny request so the UI can tell whether AI is really working.
  var checking = null;
  function check(force){
    if(checking && !force) return checking;
    checking = ask("Reply with the single word: ok").then(function(){ return {ok:true, model:lastModel}; }).catch(function(e){ return {ok:false, error:String(e && e.message || e)}; });
    return checking;
  }
  return { ask: ask, check: check, lastError: function(){ return lastError; } };
})();

(function(){var y0=null;document.addEventListener("touchstart",function(e){var sh=e.target.closest&&e.target.closest(".sheet");y0=(sh&&e.target.tagName!=="TEXTAREA")?e.touches[0].clientY:null},{passive:true});document.addEventListener("touchend",function(e){if(y0===null||!plusOpen)return;var dy=e.changedTouches[0].clientY-y0;y0=null;if(dy>70){plusOpen=false;render()}},{passive:true})})();
