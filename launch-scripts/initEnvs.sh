#!/bin/bash

for dir in $(find . -type d); do
	if [ -f "$dir/.env.template" ]; then
		if [ ! -f "$dir/.env" ]; then
			if [ "$dir" = "./jwt-service" ]; then
				echo "Secret key generation $dir/.env"
				sed -i '/^SECRETKEY=/d' "$dir/.env" 2>/dev/null || true
				echo "SECRETKEY=$(openssl rand -hex 64)" >> "$dir/.env"
			else
				cp "$dir/.env.template" "$dir/.env"
				echo "Created: $dir/.env"
			fi
		else
			echo "Already present: $dir/.env"
		fi
	fi
done
