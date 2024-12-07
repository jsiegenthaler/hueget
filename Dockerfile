FROM node:22-slim

ENV HUE_BRIDGE_IP="192.168.0.101"
ENV HUE_USERNAME="yourPhilipsHueBridgeUsername"
ENV PORT=3000

WORKDIR /usr/src/app
COPY . .

# Install hueget
RUN npm install hueget

# Expose the API port
EXPOSE $PORT

# Start hueget
CMD ["sh", "-c", "node hueget.js -i $HUE_BRIDGE_IP -u $HUE_USERNAME -p $PORT"]