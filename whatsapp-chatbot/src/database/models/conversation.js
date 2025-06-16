const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    messages: [
        {
            sender: {
                type: String,
                required: true
            },
            content: {
                type: String,
                required: true
            },
            timestamp: {
                type: Date,
                default: Date.now
            }
        }
    ],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Conversation = mongoose.model('Conversation', conversationSchema);

module.exports = Conversation;