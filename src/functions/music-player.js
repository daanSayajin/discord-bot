const ytdl = require('ytdl-core')

class MusicPlayer {
    constructor() {
        this.queue = new Map()
    }

    async execute(message) {
        const args = message.content.split(' ')
    
        const voiceChannel = message.member.voiceChannel
        if (!voiceChannel) return
    
        const songInfo = await ytdl.getInfo(args[1])
        const song = {
            title: songInfo.title,
            url: songInfo.video_url,
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
    
            queueConstruct.songs.push(song)
    
            try {
                const connection = await voiceChannel.join()
                queueConstruct.connection = connection
                this.play(message, queueConstruct.songs[0])
            } catch (err) {
                this.queue.delete(message.guild.id)
                console.error(err)
            }
        } else {
            this.serverQueue.songs.push(song)
            return message.channel.send(`✅ **${song.title}** foi adicionado à fila!`)
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
                play(message, this.serverQueue.songs[0])
            })
            .on('error', error => console.error(error))
        
        dispatcher.setVolumeLogarithmic(this.serverQueue.volume / 5)
        return message.channel.send(`🎶 Tocando: **${song.title}**`)
    }
    
    skip(message) {
        if (!message.member.voiceChannel) return message.channel.send('Você precisa estar em um canal para pular uma música!')
        
        if (!this.serverQueue) return message.channel.send('A fila está vazia, não existe nenhum som para eu pular!')
        
        this.serverQueue.connection.dispatcher.end()
    }
    
    stop(message) {
        if (!message.member.voiceChannel) return message.channel.send('Você precisa estar em um canal para tirar as músicas!')
        
        this.serverQueue.songs = []
        this.serverQueue.connection.dispatcher.end()
    }

    setServerQueue(message) {
        this.serverQueue = this.queue.get(message.guild.id)
    }
}

module.exports = MusicPlayer