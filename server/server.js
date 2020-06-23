/* eslint-disable import/no-duplicates */
import express from 'express'
import path from 'path'
import axios from 'axios'
import cors from 'cors'
import bodyParser from 'body-parser'
import sockjs from 'sockjs'

import cookieParser from 'cookie-parser'
import Html from '../client/html'

const { readFile, writeFile, unlink } = require('fs').promises // ф-ция readFile возвращает промис

const setHeaders = (req, res, next) => {
  res.set('x-skillcrucial-user', '02157a36-659a-4edc-a6b2-9da4e361bb28')
  res.set('Access-Control-Expose-Headers', 'X-SKILLCRUCIAL-USER')
  next()
}

const fileSave = (users) => {
  // запись
  return writeFile(`${__dirname}/test.json`, JSON.stringify(users), { encoding: 'utf8' })
}

const fileRead = () => {
  // ф-ция readFile возвращает промис, поэтому нужен async а в ретёрне await - но с ними не работает
  return readFile(`${__dirname}/test.json`, { encoding: 'utf8' })
    .then((data) => JSON.parse(data)) /* вернется текст, а не объект джаваскрипта */
    .catch(async () => {
      const { data: users } = await axios('https://jsonplaceholder.typicode.com/users')
      await fileSave(users) /* случается когда нет файла */
      return users
    })
}

// const deleteFile = () => {
//   return unlink(`${__dirname}/test.json`) //можно не создавать ф-цию, а написать unlink в роуте
// }

let connections = []

const port = process.env.PORT || 3000
const server = express()

server.use(cors())

server.use(express.static(path.resolve(__dirname, '../dist/assets')))
server.use(bodyParser.urlencoded({ limit: '50mb', extended: true, parameterLimit: 50000 }))
server.use(bodyParser.json({ limit: '50mb', extended: true }))

server.use(setHeaders)
server.use(cookieParser())

server.get('/api/v1/test', (req, res) => {
  res.send('Hello')
}) // read

server.get('/api/v1/users', async (req, res) => {
  const users = await fileRead()
  res.json(users)
}) // read

server.post('/api/v1/users', async (req, res) => {
  const users = await fileRead()
  const userNewBody = req.body
  const userLength = users[users.length - 1].id
  userNewBody.id = userLength + 1
  const userNew = [...users, userNewBody]
  fileSave(userNew)
  res.json({ status: 'success', id: userNewBody.id })
})
// 1) получить массив из файла test.json
// 2) добавить элементы в массив с пом спреда или конката
// 3) сохранить файл со значением (аргументом - как назовешь элемент) массива
// read write

server.patch('/api/v1/users/:userId', async (req, res) => {
  const users = await fileRead()
  const { userId } = req.params
  const userNewBody = req.body
  const usersArrayNew = users.map((it) => (it.id === +userId ? Object.assign(it, userNewBody) : it))
  fileSave(usersArrayNew)
  res.json({ status: 'success', id: userId })
})
// 1) получить массив из файла test.json
// 2) id элемента должен быть равен userid , нужно это проверить через мап или редьюс - тогда обновляешь, иначе
// возвращаешь текущий элемент +rec.id === userId (но рес надо преобразовать в число ) вернет it или 2 спреда (?)
// 3) сохранить файл со значением (аргументом - как назовешь элемент) массива
// read write

server.delete('/api/v1/users/:userId', async (req, res) => {
  const users = await fileRead()
  // 1) получить массив из файла test.json
  // 2) удалить элемент из массива с пом фильтра
  // 3) сохранить файл со значением (аргументом - как назовешь элемент) массива
  const { userId } = req.params
  const userDelete = users.filter((it) => it.id !== +userId)
  // arr1.filter((it, id) => arr1.indexOf(it) === id).filter((it, id) => arr2.indexOf(it) >= 0)
  // users.splice(+userId - 1, 1)
  fileSave(userDelete)
  res.json({ status: 'success', id: +userId })
}) // read write

server.delete('/api/v1/users', (req, res) => {
  // можно не создавать ф-цию для удаления, а написать unlink в роуте сразу
  res.json()
  return unlink(`${__dirname}/test.json`) // асинхронность не нужна, будет ошибка, файл будет все время пытаться удалить
}) // write

server.use('/api/', (req, res) => {
  res.status(404)
  res.end()
})

const echo = sockjs.createServer()
echo.on('connection', (conn) => {
  connections.push(conn)
  conn.on('data', async () => {})

  conn.on('close', () => {
    connections = connections.filter((c) => c.readyState !== 3)
  })
})

server.get('/', (req, res) => {
  // const body = renderToString(<Root />);
  const title = 'Server side Rendering'
  res.send(
    Html({
      body: '',
      title
    })
  )
})

server.get('/*', (req, res) => {
  const initialState = {
    location: req.url
  }

  return res.send(
    Html({
      body: '',
      initialState
    })
  )
})

const app = server.listen(port)

echo.installHandlers(app, { prefix: '/ws' })

// eslint-disable-next-line no-console
console.log(`Serving at http://localhost:${port}`)
