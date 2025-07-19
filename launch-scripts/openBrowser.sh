#!/bin/bash

	until curl -k -sSf https://elsalmatjori.com:16443 > /dev/null; do \
		echo "Cannot connect yet, waiting..."; \
		sleep 2; \
	done
	if command -v xdg-open >/dev/null 2>&1; then \
		xdg-open "https://elsalmatjori.com:16443"; \
	elif command -v open >/dev/null 2>&1; then \
		open "https://elsalmatjori.com:16443"; \
	fi