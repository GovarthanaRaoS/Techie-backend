const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql')
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const nodemailer = require('nodemailer');

const app = express();
app.use(cookieParser());
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

app.use(session({
    secret: 'gopi1234',
    resave: false,
    saveUninitialized: true,
    cookie: {secure: false}
}))

app.use(express.json());


app.use(cors({
    origin: ["http://localhost:3000","http://localhost:3000/dashboard"],
    credentials: true
}))

const contactEmail = nodemailer.createTransport({
    service: 'gmail',
    auth:{
        user: 'govarthanarao123@gmail.com',
        pass: 'mmvprtwxkchaqpvz'
    }
})

contactEmail.verify((error)=>{
    if(error){
        console.log('Error while verifying your mail: ',error);
    }else{
        console.log('Ready to send');
    }
})

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "root123",
    database: "nodetechie"
})

db.connect(err=>{
    if(err){
        console.log("Error fetching the results", err);
        return;
    }
    console.log("Connected to mysql database")
})

app.get('/showmembers',(req,res)=>{
    db.query("select * from users",(err,result)=>{
        if(err){
            console.log("Error while retreiving data",err);
            return
        }
        console.log("Data Retreived successfully");
        return res.json(result);
    })
})

app.post('/saveuser',(req,res)=>{
    const {name,email,password} = req.body;
    console.log(name,email,password)
    db.query("select email from users where email=?",[email],(err,result)=>{
        if(err){
            console.log("Something went wrong while checking for existing email",err);
        }
        if(result.length===0){  
            const hashedPassword = bcrypt.hashSync(password,10);
    db.query("insert into users(name,email,password) values(?,?,?)",[name,email,hashedPassword],(err,result)=>{
        if(err){
            console.log("Error while inserting into db",err);
            return
        }
        console.log("Hashed password: ", hashedPassword);
        console.log("Result of saved user: ",result);
        return res.send("User registered successfully");
    })
        }else{
            console.log("Result from db: ",result)
            res.send("Email already exists")
        }
    })
})

app.post('/login',(req,res)=>{
    const {email,password} = req.body;
        db.query("select * from users where email = ?",[email],(err,result)=>{
            if(err){
                console.log("Error while fetching user in login",err);
                return
            }
            if(result.length === 0){
                console.log("If email does not exist",result)
                return res.send("Account does not exist");
            }else{
                const user = result[0];
                console.log("If email exist",user)
                if(user && bcrypt.compareSync(password, user.password)){
                    console.log("Password matched",user);
                    const token = jwt.sign({user},'gopi1234',{expiresIn: '7d'});
                    req.session.token = token;
                    req.session.user = user;
                    res.cookie('userDetails',"hola",{maxAge:30000,httpOnly:true});
                    console.log('Cookie set');
                    console.log("Cookie setted: ",req.cookies['userDetails'])
                    console.log("Session token: ",req.session.token);
                    res.json({token});
                    // req.session.user = user;
                    // console.log("Session user: ",req.session.user);
                    // return res.send(user);
                }else{
                    console.log("Invalid credentials");
                    return res.send("Invalid credentials");
                }
            }
        })
})

// function verifyToken(req,res,next){
//     const token = req.header('Authorization');

//     if(!token){
//         return res.status(401).json({message:'Token not provided'});
//     }
//     jwt.verify(token,'gopi1234',(err,decoded)=>{
//         if(err){
//             return res.status(403).json({message:"Token invalid"});
//         }
//         req.user = decoded;
//         next();
//     })
// }

app.post('/checktoken',(req,res)=>{
    const {toki} = req.body;
    console.log("received token: ",toki);
    jwt.verify(toki,'gopi1234',(err,decoded)=>{
        if(err){
            return res.send('Token invalid');
        }
        req.user = decoded;
        console.log('received user: ',req.user)
        return res.json(req.user.user)
    })

})

app.get('/dashboard',(req,res)=>{

    const token = req.session.token;
    console.log('Token in server: ',token)
    if(!token){
        return res.send("No token found");
    }
    jwt.verify(token,'gopi1234',(err,decoded)=>{
        if(err){
            return res.status(403).send('Invalid token');
        }
        req.user = decoded;
        console.log("Session token in Dashboard: ",req.session.token)
        console.log("Decoded user: ",req.user.user);
        res.json(req.user.user);
    })
    // console.log("Session in Dashboard: ",req.session.user.name)
    // if(req.session.user){
    //     // res.send(`Welcome Mr.${req.session.user.name}`);;
    //     return res.json(req.session.user);
    // }else{
    //     res.json(null);
    //     res.send("You need to login");
    // }
});

app.get('/doesuserexist',(req,res)=>{
    const token = req.session.token;
    console.log("Toki: ",token);
    if(req.session.token){
        return res.send("User logged in");
    }else{
        return res.send("User does not exist");
    }
})

app.post('/savescores',(req,res)=>{
    const {name, email, score, category, date} = req.body;

    db.query('Delete from scoreboard where name=? and category=?',[name,category],(err,result)=>{
        if(err){
            console.log('Something went wrong while deleting user data')
        }
        console.log('Deleted successfully');
    })

    db.query('Insert into scoreboard(name,email,score,category,date) values(?,?,?,?,?)',[name,email,score,category,date],(err,result)=>{
        if(err){
            res.send('Something went wrong while inserting into scoreboard');
        }
        console.log('Result of saving scoreboard: ',result);
        return res.send('Stored successfully');
    })

})

app.post('/getprevresults',(req,res)=>{

    const {email} = req.body;

    console.log('Received Email: ',email)

    db.query('select * from scoreboard where email=?',[email],(err,result)=>{
        if(err){
            return res.send('Error occurred while fetching user')
        }
        if(result.length >0 ){
            console.log(result);
            return res.json(result);
        }else{
            console.log('results:', result);
            return res.json(['invalid']);
        }
    })
})

app.post('/updateuser',(req,res)=>{

    const {name, email ,phoneno, highest_grad, college_name, profession, company_name} = req.body;

    db.query('update users set name=?, phoneno=?, highest_grad=?, college_name=?, profession=?, company_name=? where email=?',[name,phoneno,highest_grad,college_name,profession, company_name,email ],(err,result)=>{
        if(err){
            console.log('Error: ',err);
            return res.send('Something went wrong while updating the users');
        }
        console.log('Result while updating ',result);
        return res.send('Updated successfully');
    })
})

app.post('/contact',(req,res)=>{
    const {name, email, subject, message} = req.body;
    const mail = {
        from: name,
        to: 'govarthanarao123@gmail.com',
        subject: subject,
        html: `<p>Name: ${name}</p>
                <p>Email: ${email}</p>
                <p>Subject: ${subject}</p>
                <p>Message: ${message}</p>`
    };
    contactEmail.sendMail(mail,(error)=>{
        if(error){
            res.json({status: 'Error'});
        }else{
            res.json({status: 'Message sent'});
        }
    })
})

app.post('/logout',(req,res)=>{
    req.session.destroy((err)=>{
        if(err){
            console.log("Something went wrong while destroying the session")
            res.status(500).send('Error destroying session');
        }else{
            res.clearCookie('userDetails');
            res.status(200).send('Logged out successfully');
        }
    });
})

app.listen(9092,()=>{
    console.log("Listening in port 9092");
})