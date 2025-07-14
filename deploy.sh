#!/bin/bash

# Deploy to Netlify using CLI
echo "Deploying HomeFlow to Netlify..."

# Deploy the web directory
netlify deploy --dir=web --prod

echo "Deployment complete!"