#!/bin/bash

cat .env.template > .env
cat users-service/.env.template > users-service/.env
cat redis-service/.env.template > redis-service/.env
cat jwt-service/.env.template > jwt-service/.env
cat id-service/.env.template > id-service/.env
cat game-service/.env.template > game-service/.env
cat blockchain-service/.env.template > blockchain-service/.env
cat avatars-service/.env.template > avatars-service/.env

echo " ###### ENV BUILD OK ######"
echo "███████╗██╗░░░░░░██████╗░█████╗░██╗░░░░░███╗░░░███╗░█████╗░████████╗░░░░░██╗░█████╗░██████╗░██╗░░░███████╗███╗░░██╗██╗░░░██╗"
echo "██╔════╝██║░░░░░██╔════╝██╔══██╗██║░░░░░████╗░████║██╔══██╗╚══██╔══╝░░░░░██║██╔══██╗██╔══██╗██║░░░██╔════╝████╗░██║██║░░░██║"
echo "█████╗░░██║░░░░░╚█████╗░███████║██║░░░░░██╔████╔██║███████║░░░██║░░░░░░░░██║██║░░██║██████╔╝██║░░░█████╗░░██╔██╗██║╚██╗░██╔╝"
echo "██╔══╝░░██║░░░░░░╚═══██╗██╔══██║██║░░░░░██║╚██╔╝██║██╔══██║░░░██║░░░██╗░░██║██║░░██║██╔══██╗██║░░░██╔══╝░░██║╚████║░╚████╔╝░"
echo "███████╗███████╗██████╔╝██║░░██║███████╗██║░╚═╝░██║██║░░██║░░░██║░░░╚█████╔╝╚█████╔╝██║░░██║██║██╗███████╗██║░╚███║░░╚██╔╝░░"
echo "╚══════╝╚══════╝╚═════╝░╚═╝░░╚═╝╚══════╝╚═╝░░░░░╚═╝╚═╝░░╚═╝░░░╚═╝░░░░╚════╝░░╚════╝░╚═╝░░╚═╝╚═╝╚═╝╚══════╝╚═╝░░╚══╝░░░╚═╝░░░"
echo ""
echo "!!BLOCKCHAIN NEEDS MANUAL EDITING!!" 