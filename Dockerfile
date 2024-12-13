FROM node:22-slim

ENV HUE_BRIDGE_IP="yourPhilipsHueBridgeIpAddress"
ENV HUE_USERNAME="yourPhilipsHueApiUsername"
ENV PORT=3000

WORKDIR /usr/src/app
COPY . .

# Install hueget
RUN npm install hueget

# Expose the API port
EXPOSE $PORT

# Start hueget
CMD ["sh", "-c", "node hueget.js -i $HUE_BRIDGE_IP -u $HUE_USERNAME -p $PORT"]