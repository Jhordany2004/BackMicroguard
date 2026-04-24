const axios = require("axios");

const sendBrevoEmail = async ({ to, subject, html }) => {
    return axios.post(
        process.env.URL_BREVO_EMAIL,
        {
            sender: {
                email: process.env.BREVO_SENDER,
                name: "Soporte Microguard",
            },
            to: [{ email: to }],
            subject,
            htmlContent: html,
        },
        {
            headers: {
                "api-key": process.env.BREVO_API_KEY,
                "Content-Type": "application/json",
            },
            timeout: 15000,
        }
    );
};

module.exports = sendBrevoEmail;