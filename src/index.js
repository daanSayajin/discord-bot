const Discord = require('discord.js')
const request = require('request-promise')
const random = require('random')
const url = require('url')
const download = require('image-downloader')
const sha1 = require('sha1')
const fs = require('fs')

const { BOT_TOKEN, GOOGLE_TOKEN } = require('./config/config.json')
const MusicPlayer = require('./functions/music-player')

const client = new Discord.Client()
const musicPlayer = new MusicPlayer()

client.on('ready', () => console.log('Ready!')) 

client.on('message', async message => {
    if (message.author.bot || !message.content.startsWith('!')) return

    musicPlayer.setServerQueue(message)

    if (message.content.startsWith('!tocar')) 
        musicPlayer.execute(message)

    else if (message.content.startsWith('!pular')) 
        musicPlayer.skip(message)

    else if (message.content.startsWith('!parar')) 
        musicPlayer.stop(message)

    else if (message.content.startsWith('!limpar')) 
        clear(message)

    else if (message.content.startsWith('!buscar'))
        search(message)
})

async function search(message) {
    const args = message.content.split(' ')

    const data = JSON.parse(await request(`https://www.googleapis.com/customsearch/v1?key=${GOOGLE_TOKEN}&q=${args[1]}&num=1&start=${random.int(1, 200)}&searchType=image&cx=005675209231366018625:ugrih6rmg1j`))

    const image = sha1(random.int(0, 100000)) + url.parse(data.items[0].link).pathname.slice(url.parse(data.items[0].link).pathname.length - 5)

    download.image({
        url: data.items[0].link,
        dest: image
    }).then(async ({ filename }) => {
        const imageWasSent = await message.channel.send({
            files: [filename]
        })

        if (imageWasSent) 
            await fs.unlinkSync(filename)
    }).catch(err => console.error(err))
}

function clear(message) {
    if (!message.member.hasPermission('MANAGE_MESSAGES')) return message.channel.send('Você não tem permissão para limpar o chat!')

    message.channel.fetchMessages()
        .then(list => {
            message.channel.bulkDelete(list)
        }, err => message.channel.send('Falha ao limpar o chat!'))        
}

client.login(BOT_TOKEN)
