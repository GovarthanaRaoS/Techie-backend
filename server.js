const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql')
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const nodemailer = require('nodemailer');
const path = require('path');

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
    origin: [
            "http://localhost:3000",
            "https://techie-webapp.onrender.com"
            // "http://localhost:3000/dashboard2",
            //  "https://techie-webapp.onrender.com",
            //  "https://techie-webapp.onrender.com/greet",
            //  "https://techie-webapp.onrender.com/dashboard2",
            //  "https://techie-webapp.onrender.com/dashboard2/taketest/general",
            ],
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

const pool = mysql.createPool({
    waitForConnections: true,
    connectionLimit: 10,
    host: "sql12.freesqldatabase.com",
    user: "sql12658683",
    password: "927S3KFsBh",
    database: "sql12658683"
})

// const db = mysql.createConnection({
//     host: "localhost",
//     user: "root",
//     password: "root123",
//     database: "nodetechie"
// })

// db.connect(err=>{
//     if(err){
//         console.log("Error fetching the results", err);
//         return;
//     }
//     console.log("Connected to mysql database")
// })

app.get('/greet',(req,res)=>{
    return res.send('Hello');
})

app.get('/getusers',(req,res)=>{

    pool.getConnection((errorr,db)=>{
        if(errorr){
            res.send('Error occurred while establishing connection in getting users query',errorr);
        }else{
            db.query("select id, name, email, role from users",(err,result)=>{
                if(err){
                    console.log("Error while retreiving data",err);
                    db.release();
                    return res.json([{message: 'error'}]);
                }
                if(result.length>0){
        
                    console.log("Data Retreived successfully");
                    db.release();
                    return res.json(result);
        
                }else{
        
                    console.log("Nothing to return");
                    db.release();
                    return res.json(result);
        
                }
        
            })
        }
    })
})

// app.post('/saveuser2',(req,res)=>{
//     const {name, email, password} = req.body;

//     db.query("insert into users(name,email,password) values(?,?,?)",[name,email,password],(err,result)=>{
//         if(err){
//             console.log('Error:',err);
//         }
//         return res.send('Data Stored Successfully');
//     })
// })

app.post('/updaterole',(req,res)=>{

    pool.getConnection((errorr,db)=>{
        if(errorr){
            res.send("Error occurred while establishing connection in updating role query ",errorr)
            return
        }else{
            const {email,role} = req.body;
            db.query('update users set role=? where email=?',[role,email],(err,result)=>{
                if(err){
                    console.log('Something went wrong while updating user',err);
                    db.release();
                    return res.send('error');
                }
                console.log(result);
                db.release();
                return res.send('Update successful');
            })
        }
    })
})

app.delete('/deleteuser/:email',(req,res)=>{

    pool.getConnection((errorr,db)=>{
        if(errorr){
            res.send("Error occurred while establishing connection in deleting query ",errorr);
            return
        }else{
            // const {isModerator} = req.body;
            // const {isAdmin} = req.body;
            // console.log('IsModerator: ',isModerator);
            // console.log('isAdmin: ',isAdmin);
            const {email} = req.params;
            console.log('Delete Email: ',email);
        
                db.query('delete from users where email = ?',[email],(err,result)=>{
                    if(err){
                        console.log('Something went wrong while deleting the user');
                        db.release();
                        return res.send('error deleting');
                    }
                    console.log('Result of Deletion: ',result);
                    req.session.destroy(error=>{
                        if(error){
                            console.log('Something went wrong while deleting moderator email',error);
                            db.release();
                            return;
                        }
                    })
                    db.release();
                    return res.send('Delete successfully');
                    
                })
        }
    })
})

app.post('/saveuser',(req,res)=>{

    pool.getConnection((errorr,db)=>{
        if(errorr){
            res.send('Error occurred while establishing connection in signing save query',errorr);
        }else{

            const {name,email,password, role} = req.body;
            console.log(name,email,password, role)
            db.query("select email from users where email=?",[email],(err,result)=>{
                if(err){
                    console.log("Something went wrong while checking for existing email",err);
                    db.release();
                    return res.json({message:'error'})
                }
                if(result.length===0){  
                    const hashedPassword = bcrypt.hashSync(password,10);
            db.query("insert into users(name,email,password,role) values(?,?,?,?)",[name,email,hashedPassword,role],(err,result)=>{
                if(err){
                    console.log("Error while inserting into db",err);
                    db.release();
                    return
                }
                console.log("Hashed password: ", hashedPassword);
                console.log("Result of saved user: ",result);
                db.release();
                return res.send("User registered successfully");
            })
                }else{
                    console.log("Result from db: ",result);
                    db.release();
                    res.send("Email already exists");
                }
            })

        }
    })
})

app.post('/login',(req,res)=>{

    pool.getConnection((errorr,db)=>{

        if(errorr){
            res.send('Error occurred while establishing connection in logging query',errorr);
            return;
        }else{

            const {email,password} = req.body;
            db.query("select * from users where email = ?",[email],(err,result)=>{
                if(err){
                    console.log("Error while fetching user in login",err);
                    res.json({message: 'error'});
                    db.release();
                    return
                }
                if(result.length === 0){
                    console.log("If email does not exist",result);
                    db.release();
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
                        db.release();
                        // req.session.user = user;
                        // console.log("Session user: ",req.session.user);
                        // return res.send(user);
                    }else{
                        console.log("Invalid credentials");
                        db.release();
                        return res.send("Invalid credentials");
                    }
                }
            })

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

    pool.getConnection((errorr, db)=>{

        if(errorr){
            res.send('Error occurred while establishing connection in saving user query',errorr);
        }else{

            const {name, email, score, category, date} = req.body;

            db.query('Delete from scoreboard where name=? and category=?',[name,category],(err,result)=>{
                if(err){
                    console.log('Something went wrong while deleting user data');
                    db.release();
                    return;
                }
                console.log('Deleted successfully');
            })
        
            db.query('Insert into scoreboard(name,email,score,category,date) values(?,?,?,?,?)',[name,email,score,category,date],(err,result)=>{
                if(err){
                    res.send('Something went wrong while inserting into scoreboard');
                    db.release();
                    return;
                }
                console.log('Result of saving scoreboard: ',result);
                db.release();
                return res.send('Stored successfully');
            })

        }

    })

})

app.post('/getprevresults',(req,res)=>{

    pool.getConnection((errorr,db)=>{
        if(errorr){
            res.send('Error occurred while establishing connection in getting previous results query',errorr);
        }else{

            const {email} = req.body;

            console.log('Received Email: ',email)
        
            db.query('select * from scoreboard where email=?',[email],(err,result)=>{
                if(err){
                    console.log('Error while getting previous result: ',err);
                    db.release();
                    return res.json([]);
                }
                if(result.length >0 ){
                    console.log(result);
                    db.release();
                    return res.json(result);
                }else{
                    console.log('results:', result);
                    db.release();
                    return res.json(result);
                }
            })

        }
    })

})

app.get('/getscoreboard',(req,res)=>{

    pool.getConnection((errorr,db)=>{
        if(errorr){
            res.send('Error occurred while establishing connection in getting scoreboard query',errorr)
        }else{
            db.query('select * from scoreboard',(err,result)=>{
                if(err){
                    console.log('Error while fetching the scoreboard: ',err);
                    db.release();
                    return res.json([{message: 'error'}]);
                }
                db.release();
                return res.json(result);
            })
        }
    })
})

app.post('/sorteduser',(req,res)=>{

    pool.getConnection((errorr,db)=>{
        if(errorr){
            res.send('Error occurred while establishing connection in sorting user name query',errorr)
        }else{

            const {isAsc} = req.body;
            if(isAsc){
        
                db.query('select * from users order by name',(err,result)=>{
                    if(err){
                        console.log('Error while sorting users');
                        db.release();
                        return res.send('error');
                    }
                    console.log('Sorted user ascending: ',result);
                    db.release();
                    return res.json(result);
                })
        
            }else{
        
                db.query('select * from users order by name DESC',(err,result)=>{
                    if(err){
                        console.log('Error while sorting users');
                        db.release();
                        return res.send('error');
                    }
                    console.log('Sorted user descending: ',result);
                    db.release();
                    return res.json(result);
                })
        
            }

        }
    })

})

//Sorting Queries

app.post('/sortname',(req,res)=>{

    pool.getConnection((errorr,db)=>{
        if(errorr){
            res.send('Error occurred while establishing connection in sorting user name query',errorr)
        }else{

            const {isAsc} = req.body;
            // console.log('type: ',type);
            console.log('isAsc: ',isAsc);
            if(isAsc){
                db.query('SELECT * FROM scoreboard ORDER BY name ASC',(err,result)=>{
                    if(err){
                        console.log('Error while sorting by name: ',err);
                        db.release();
                        return res.send('error')
                    }
                    console.log('Returned Ascending response: ',result);
                    db.release();
                    return res.json(result);
                })
            }else{
                db.query('SELECT * FROM scoreboard ORDER BY name DESC',(err,resultt)=>{
                    if(err){
                        console.log('Error while sorting by name: ',err);
                        db.release();
                        return res.send('error')
                    }
                    console.log('Returned descending response: ',resultt);
                    db.release();
                    return res.json(resultt);
                })
            }

        }
    })

})

app.post('/sortemail',(req,res)=>{

    pool.getConnection((errorr,db)=>{
        if(errorr){
            res.send('Error occurred while establishing connection in sorting user email query',errorr);
        }else{

            const {isAsc} = req.body;
            // console.log('type: ',type);
            console.log('isAsc: ',isAsc);
            if(isAsc){
                db.query('SELECT * FROM scoreboard ORDER BY email ASC',(err,result)=>{
                    if(err){
                        console.log('Error while sorting by email: ',err);
                        db.release();
                        return res.send('error')
                    }
                    console.log('Returned Ascending response: ',result);
                    db.release();
                    return res.json(result);
                })
            }else{
                db.query('SELECT * FROM scoreboard ORDER BY email DESC',(err,resultt)=>{
                    if(err){
                        console.log('Error while sorting by email: ',err);
                        db.release();
                        return res.send('error')
                    }
                    console.log('Returned descending response: ',resultt);
                    db.release();
                    return res.json(resultt);
                })
            }

        }
    })

})

app.post('/sortscore',(req,res)=>{

    pool.getConnection((errorr,db)=>{
        if(errorr){
            res.send('Error occurred while establishing connection in sorting user score query',errorr);
        }else{

            const {isAsc} = req.body;
            // console.log('type: ',type);
            console.log('isAsc: ',isAsc);
            if(isAsc){
                db.query('SELECT * FROM scoreboard ORDER BY score ASC',(err,result)=>{
                    if(err){
                        console.log('Error while sorting by score: ',err);
                        db.release();
                        return res.send('error')
                    }
                    console.log('Returned Ascending response: ',result);
                    db.release();
                    return res.json(result);
                })
            }else{
                db.query('SELECT * FROM scoreboard ORDER BY score DESC',(err,resultt)=>{
                    if(err){
                        console.log('Error while sorting by score: ',err);
                        db.release();
                        return res.send('error')
                    }
                    console.log('Returned descending response: ',resultt);
                    db.release();
                    return res.json(resultt);
                })
            }

        }
    })

})

app.post('/sortcategory',(req,res)=>{

    pool.getConnection((errorr,db)=>{
        if(errorr){
            res.send('Error occurred while establishing connection in sorting user category query',errorr);
        }else{

            const {isAsc} = req.body;
            // console.log('type: ',type);
            console.log('isAsc: ',isAsc);
            if(isAsc){
                db.query('SELECT * FROM scoreboard ORDER BY category ASC',(err,result)=>{
                    if(err){
                        console.log('Error while sorting by category: ',err);
                        db.release();
                        return res.send('error')
                    }
                    console.log('Returned Ascending response: ',result);
                    db.release();
                    return res.json(result);
                })
            }else{
                db.query('SELECT * FROM scoreboard ORDER BY category DESC',(err,resultt)=>{
                    if(err){
                        console.log('Error while sorting by category: ',err);
                        db.release();
                        return res.send('error')
                    }
                    console.log('Returned descending response: ',resultt);
                    db.release();
                    return res.json(resultt);
                })
            }

        }
    })

})

app.post('/sortdate',(req,res)=>{

    pool.getConnection((errorr,db)=>{
        if(errorr){
            res.send('Error occurred while establishing connection in sorting user date query',errorr);
        }else{

            const {isAsc} = req.body;
            // console.log('type: ',type);
            console.log('isAsc: ',isAsc);
            if(isAsc){
                db.query('SELECT * FROM scoreboard ORDER BY date ASC',(err,result)=>{
                    if(err){
                        console.log('Error while sorting by date: ',err);
                        db.release();
                        return res.send('error')
                    }
                    console.log('Returned Ascending response: ',result);
                    db.release();
                    return res.json(result);
                })
            }else{
                db.query('SELECT * FROM scoreboard ORDER BY date DESC',(err,resultt)=>{
                    if(err){
                        console.log('Error while sorting by date: ',err);
                        db.release();
                        return res.send('error')
                    }
                    console.log('Returned descending response: ',resultt);
                    db.release();
                    return res.json(resultt);
                })
            }

        }
    })

})

//End of Sorting Queries

app.post('/getuserdata',(req,res)=>{

    pool.getConnection((errorr,db)=>{
        if(errorr){
            res.send('Error occurred while establishing connection in getting user data query',errorr);
        }else{

            const {email} = req.body;

            db.query('select name, email, phoneno, highest_grad, college_name, profession, company_name from users where email = ?',[email],(err,result)=>{
                if(err){
                    console.log('Something went wrong while returning user data for updating');
                    db.release();
                    return res.json([{message: 'error'}])
                }
                console.log('Retreived user data for updating: ',result);
                db.release();
                return res.json(result);
            })

        }
    })

})

app.post('/updateuser',(req,res)=>{

    pool.getConnection((errorr,db)=>{

        if(errorr){
            res.send('Error occurred while establishing connection in updating user query',errorr);
        }else{

            const {name, email ,phoneno, highest_grad, college_name, profession, company_name} = req.body;

            db.query('update users set name=?, phoneno=?, highest_grad=?, college_name=?, profession=?, company_name=? where email=?',[name,phoneno,highest_grad,college_name,profession, company_name,email ],(err,result)=>{
                if(err){
                    console.log('Error: ',err);
                    db.release();
                    return res.json([{message: 'error'}]);
                }
                console.log('Result while updating ',result);
                db.release();
                // db.query('select name, email, phoneno, highest_grad, college_name, profession, company_name from users where email = ?',[email],(errr,resul)=>{
        
                // })
                return res.send('Updated successfully');
            })

        }

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

// if(process.env.NODE_ENV === 'production'){

//     app.use(express.static('techie_frontend/build'))
//     const path = require('path');

//     app.get('/*', (req, res, next) => {
//         console.log('Redirecting to index.html')
//         res.sendFile(path.resolve(__dirname,'techie-frontend','build','index.html'))
//       });
// }



// app.get('/*',(req,res)=>{
//     res.sendFile(
//         path.join('../../tech-front/Techie-Frontend/build/index.html')
//     )
// })

// app.get('/*',(req,res)=>{

// })

// app.get('/*',(req,res)=>{
//     res.sendFile(path.resolve(__dirname,'../../tech-front/Techie-Frontend/build/index.html'))
// })

// app.get('/getf',(req,res)=>{
//     res.sendFile(path.join(__dirname,'../../tech-front/Techie-Frontend/public/index.html'),(err)=>{
//         if(err){
//             return res.status(500).send(err);
//         }
//     }
//     )
// })
app.listen(9092,()=>{
    console.log("Listening in port 9092");
})
