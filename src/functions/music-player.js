const ytdl = require('ytdl-core')
const Youtube = require('simple-youtube-api')

const { GOOGLE_TOKEN } = require('../config/config.json')

class MusicPlayer {
    constructor() {
        this.queue = new Map()
        this.youtube = new Youtube(GOOGLE_TOKEN)
    }

    async execute(message) {
        const args = message.content.split(' ')
        let songId
        let song = []
        let playlist

        args.shift()

        if (!args[0].includes('youtu')) 
            songId = JSON.parse(JSON.stringify(await this.youtube.searchVideos(args.join(' '), 1)))[0].id
        
        else if (args[0].includes('playlist')) {
            playlist = await this.youtube.getPlaylist(args[0])
            songId = JSON.parse(JSON.stringify(await playlist.getVideos()))
        } 
        
        else
            songId = args[0]

        const voiceChannel = message.member.voiceChannel
        if (!voiceChannel) return message.channel.send('\`\`\`js\n❓❗ Você NÃO está em um canal de voz!\`\`\`')

        if (songId instanceof Array) {
            songId.map(curSong => {
                song.push({
                    title: curSong.title,
                    url: 'https://www.youtube.com/watch?v=' + curSong.id
                })
            })
        } 
        
        else {
            const songInfo = await ytdl.getInfo(songId)
            song.push({
                title: songInfo.title,
                url: songInfo.video_url,
            })
        }
        
        if (!this.serverQueue) {
            const queueConstruct = {
                textChannel: message.channel,
                voiceChannel: voiceChannel,
                connection: null,
                songs: [],
                volume: 5,
                playing: true
            }
    
            this.queue.set(message.guild.id, queueConstruct)

            song.map(curSong => queueConstruct.songs.push(curSong))

            if (song.length > 1)    
                message.channel.send(`\`\`\`js\n✅ As músicas de "${playlist.title}" foram adicionadas à fila!\`\`\``)
    
            try {
                const connection = await voiceChannel.join()
                queueConstruct.connection = connection
                this.play(message, queueConstruct.songs[0])
            } catch (err) {
                this.queue.delete(message.guild.id)
                console.error(err)
            }
        } else {
            song.map(curSong => this.serverQueue.songs.push(curSong))

            if (song.length > 1)    
                return message.channel.send(`\`\`\`js\n✅ As músicas de "${playlist.title}" foram adicionadas à fila!\`\`\``)

            return message.channel.send(`\`\`\`js\n✅ "${song[0].title}" foi adicionado à fila!\`\`\``)
        }
    }
    
    async play(message, song) {
        const guild = message.guild
        this.serverQueue = this.queue.get(guild.id)
    
        if (!song) {
            this.serverQueue.voiceChannel.leave()
            this.queue.delete(guild.id)
            return
        }

        const dispatcher = this.serverQueue.connection.playStream(ytdl(song.url))
            .on('end', () => {
                this.serverQueue.songs.shift()
                this.play(message, this.serverQueue.songs[0])
            })
            .on('error', error => console.error(error))
        
        dispatcher.setVolumeLogarithmic(this.serverQueue.volume / 5)
        return message.channel.send(`\`\`\`js\n🎶 Tocando: "${song.title}"\`\`\``)
    }
    
    skip(message) {
        if (!message.member.voiceChannel) return message.channel.send('Você precisa estar em um canal para pular uma música!')
        
        if (!this.serverQueue) return message.channel.send('A fila está vazia, não existe nenhum som para eu pular!')
        
        this.serverQueue.connection.dispatcher.end()
    }
    
    stop(message) {
        if (!message.member.voiceChannel) return message.channel.send('\`\`\`js\n❓❗ Você precisa estar em um canal para parar a música!\`\`\`')
        
        this.serverQueue.songs = []
        this.serverQueue.connection.dispatcher.end()
    }

    setServerQueue(message) {
        this.serverQueue = this.queue.get(message.guild.id)
    }

    queue(message) {
        const songs = this.serverQueue.songs.reduce((acc, song, i) => `${acc}"${song.title}"${i === 0 ? ' { Tocando agora }' : ''}\n`, '')
        return message.channel.send(`\`\`\`js\n▶️ As músicas na fila são: \n${songs}Digite !pular para pular a música que está tocando agora!\`\`\``)
    }
}

module.exports = MusicPlayer