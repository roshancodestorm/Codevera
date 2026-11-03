const nodemailer = require('nodemailer');
require('dotenv').config({path:'F:/Projects/Codestrom/.env'});
const t = nodemailer.createTransport({service:'gmail',auth:{user:process.env.EMAIL_USER,pass:process.env.EMAIL_PASS}});
t.verify((e)=>{
  if(e){ console.error('ERR:'+e.message); process.exit(1); }
  else { console.log('OK'); process.exit(0); }
});
