const nodemailer = require('nodemailer');
require('dotenv').config({path:'../.env'});
const t = nodemailer.createTransport({service:'gmail',auth:{user:process.env.EMAIL_USER,pass:process.env.EMAIL_PASS}});
t.verify((e)=>{ if(e){console.error('ERR'); process.exit(1);} console.log('OK'); process.exit(0); });
