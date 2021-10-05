const express = require('express');
const bcrypt = require('bcrypt-nodejs');
const app = express();
const cors = require('cors');
const config = require('./config.js');




//? Kullanıcılar Veritabanı
const db = require('knex')({
    client: 'pg',
    connection: {
        host: process.env.DATABASE_URL,
        ssl: true
    }
});
////

// Giriş Veritabanı



//! Functions

const knexScraper = (dataB, req,res, purpose, errorMsg) => {

    if(purpose === 'login')
    {

        dataB.select('email', 'hash').from('login')
            .where('email', '=', req.body.email)
            .then(data => {
               const isValid = bcrypt.compareSync(req.body.password, data[0].hash);
               if(isValid)
               {
                   db.select('*').from('users')
                       .where('email', '=', req.body.email)
                       .then(user => {
                           res.json(user[0]);
                       })
                       .catch(err => res.status(400).json('unable to get user'))

               }
               else
               {
                   res.status(400).json('wrong credentials');
               }
            })
            .catch(err =>res.status(400).json('wrong credentials.'));

    }
    else if (purpose === 'register')
    {
        const hash = bcrypt.hashSync(req.body.password);
        if(req.body.password.length > 6 && req.body.email.length > 0)
        {
            dataB.transaction(trx => {
                trx.insert({
                    hash: hash,
                    email: req.body.email
                })
                    .into('login')
                    .returning('email')
                    .then(logEmail => {
                        trx('users')
                            .returning('*')
                            .insert({
                                email: logEmail[0],
                                name: req.body.name.toLowerCase(),
                                joined: new Date()
                            })
                            .then(user => res.json(user[0]))
                            .catch(err => res.status(400).json(errorMsg))
                    })
                    .then(trx.commit)
                    .catch(trx.rollback)
            })
                .catch(err => res.status(400).json(errorMsg));
        }
        else
        {
            res.status(401).json('fill in the blank mk');
        }

    }
    else if (purpose === 'profile')
    {
        dataB.select('*').from('users').where({
            id: req.params.id
        })
        .then(user => {
            if(user.length) res.json(user[0]);
            else res.status(400).json(errorMsg);
        })
        .catch(err => {
            res.status(400).json(errorMsg);
        })
    }
    else if (purpose === 'image')
    {
        dataB('users').where('id', '=', req.body.id)
            .increment('entries', 1)
            .returning('entries')
            .then(entry => res.json(entry[0]))
            .catch(err => res.status(400).json('unable to get entries.'))
    }

}
//TODO 1. signin özelliğini kullanabilmek için veritabanı ile server arasındaki ilişkiyi hallet. DONE



app.use(express.json());
app.use(cors());




//! ROOT ROUTE
app.get('/', (req, res) => {


});

//! SIGNIN ROUTE
app.post('/signin', (req, res) => {
    knexScraper(db,req,res, 'login','email or password is incorrect, please try again.');

});

//! REGISTER ROUTE
app.post('/register', (req, res) => {
    const { email, name, password} = req.body;
    knexScraper(db,req,res, 'register','An error occured please try again.');

});

app.get('/profile/:id', (req, res) => {

    knexScraper(db,req,res,'profile','Cant fetch profile, probably id is not correct.');
})

app.put('/image', (req,res) => {
    knexScraper(db, req,res, 'image', 'Not found.')

})




//! LISTEN TO PORT
app.listen(process.env.PORT || 3000, () =>{
    console.log(`Uygulama ${process.env.PORT} portunda çalışıyor...`);
});



/*
/ --> res = this is working
/signin --> POST = success/fail
/register --> POST = user
/profile/:userId --> GET = user
/image --> PUT --> user
*/
