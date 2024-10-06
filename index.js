import axios from 'axios';
import { Markup, Telegraf } from 'telegraf';

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

const userState = {}
const eventState = {}

bot.command('start', ctx => {
    ctx.reply('АА VIKLUCHI')
})

bot.command('menu', ctx => {
    ctx.reply('Выберите команду', Markup.keyboard([
        ['Регистрация', 'Вход'],
        ['Новое напоминание']
    ]).resize())
})

bot.hears('Вход', ctx => {
    const userId = ctx.from.id
    userState[userId] = { awaitingLogin: true, action: 'login' }

    ctx.reply('Вход\nВведите логин')
})

bot.hears('Регистрация', ctx => {
    const userId = ctx.from.id
    userState[userId] = { awaitingLogin: true, action: 'create' }

    ctx.reply('Регистрация\nВведите логин')
})

bot.hears('Новое напоминание', ctx => {
    const userId = ctx.from.id
    eventState[userId] = { awaitingEventName: true }

    ctx.reply('Создание напоминания\nВведите название')
})

bot.on('text', async ctx => {
    const userId = ctx.from.id

    if (userState[userId]) {
        if (userState[userId].awaitingLogin) {
            const login = ctx.message.text.trim()
            userState[userId].login = login
            userState[userId].awaitingLogin = false

            if (userState[userId].action === 'login') {
                ctx.reply('Введите пароль')
                userState[userId].awaitingPassword = true
            }

            if (userState[userId].action === 'create') {
                ctx.reply('Введите email')
                userState[userId].awaitingEmail = true
            }
        } else if (userState[userId].awaitingEmail) {
            const email = ctx.message.text.trim()
            userState[userId].email = email
            userState[userId].awaitingEmail = false

            ctx.reply('Введите пароль')
            userState[userId].awaitingPassword = true
        } else if (userState[userId].awaitingPassword) {
            const password = ctx.message.text.trim()
            userState[userId].password = password
            userState[userId].awaitingPassword = false

            let result
            if (userState[userId].action === 'login') {
                result = await loginUser(
                    userId,
                    userState[userId].login,
                    userState[userId].password,
                )
            } else if (userState[userId].action === 'create') {
                result = await createUser(
                    userId,
                    userState[userId].login,
                    userState[userId].email,
                    userState[userId].password,
                )
            }
            ctx.reply(result)
        }
    }

    if (eventState[userId]) {
        if (eventState[userId].awaitingEventName) {
            const postName = ctx.message.text
            eventState[userId].name = postName
            eventState[userId].awaitingEventName = false

            ctx.reply('Введите описание')
            eventState[userId].awaitingEventContent = true
        } else if (eventState[userId].awaitingEventContent) {
            const eventContent = ctx.message.text
            eventState[userId].content = eventContent
            eventState[userId].awaitingEventContent = false

            let result

            if (userState[userId] && userState[userId].accessToken) {
                result = await createEvent(
                    eventState[userId].name,
                    eventState[userId].content,
                    userState[userId].accessToken,
                )
            } else {
                result = 'пупупу'
            }
            ctx.reply(result)
        }
    }
})

bot.launch().then(() => {
    console.log('Bot is running...')
})

const loginUser = async (userId, login, password) => {
    const payload = {
        'username': login,
        'password': password,
    };

    const response = await axios.post('http://events.hyth.com/user/login', JSON.stringify(payload));

    if (response.data.status === 'success') {
        userState[userId].accessToken = response.data.data.accessToken
        return 'Успешный вход'
    } else {
        return 'Ачибка такого юзера нет'
    }
}

const createUser = async (userId, login, email, password) => {
    const payload = {
        'username': login,
        'email': email,
        'password': password,
    }

    const response = await axios.post('http://events.hyth.com/user/create', JSON.stringify(payload))

    if (response.data.status === 'success') {
        userState[userId].accessToken = response.data.data.accessToken
        return 'Пользователь успешно создан'
    } else {
        const errors = Object.values(response.data.data)
        return 'Ошибка создания пользователя:\n' + errors
    }
}

const createEvent = async (name, content, accessToken) => {
    const payload = {
        'name': name,
        'content': content,
        'accessToken': accessToken,
    }

    const response = await axios.post('http://events.hyth.com/event/create', JSON.stringify(payload))

    if (response.data.status === 'success') {
        return 'Напоминание успешно создано'
    } else {
        const errors = Object.values(response.data.data)
        return 'Ошибка создания напоминания:\n' + errors
    }
}