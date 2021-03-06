echo "Copy local nginx.conf to server home"
scp -r nginx.conf stijn@discat.website:"~stijn/nginx.conf"
echo "Move conf from server home to nginx directory"
ssh -t stijn@discat.website "sudo mv ~stijn/nginx.conf /etc/nginx/nginx.conf"
echo "Restart nginx"
ssh -t stijn@discat.website "sudo nginx -s reload"
read -p "Done!"