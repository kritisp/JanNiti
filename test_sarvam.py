import os
from dotenv import load_dotenv
from sarvamai import SarvamAI

load_dotenv()

client = SarvamAI(
    api_subscription_key=os.environ["SARVAM_API_KEY"]
)

response = client.chat.completions(
    model="sarvam-105b",
    max_tokens=200,
    reasoning_effort=None,
    messages=[
        {
            "role":"system",
            "content":"You are a helpful AI assistant."
        },
        {
            "role":"user",
            "content":"Say hello in English, Hindi and Odia."
        }
    ]
)

print(response.choices[0].message.content)
