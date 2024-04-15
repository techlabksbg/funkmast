
put:
	rsync -avrz *.js *.css *.html *.php *.png manifest.json ivo@mx:/var/www/html/funkmast/.


goodbad:
	scp ivo@mx:/var/www/html/funkmast/good.txt .
	scp ivo@mx:/var/www/html/funkmast/bad.txt .
