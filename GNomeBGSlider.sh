#!/bin/bash

#Location of the images
Directory=$HOME/Afbeeldingen/Wallpapers

#Duration of display
Seconden=30

#Picture-Options ('none' 'wallpaper' 'centered' 'scaled' 'stretched' 'zoom' 'spanned')
Option='spanned'

# +----------------------------------------------------------------------------------+
# |                                                                                  |
# |   D O   N O T   E D I T   B E N E A T H   T H I S   L I N E  !!!                 |
# |                                                                                  |
# +----------------------------------------------------------------------------------+
# |   BEGIN:                                                                         |
# +----------------------------------------------------------------------------------+


Name=${0##*/}
printf "**\n**  $Name\n**  Version: 1.0	By: AIsin\n**\n\n"
PrintEND() {
	printf "\n**\n** THANKS FOR USING 'AIsin'-SCRIPTS..\n**\n"
}


shopt -s globstar


Temp=$Directory/GNomeBGSlider


Clean() {
	if [ -d "$Temp" ]
	then
		rm -R "$Temp"
	fi
}


CleanUp() {
	# Perform program exit housekeeping
	Clean
	
	PrintEND
	exit
}
trap CleanUp SIGHUP SIGINT SIGTERM


GBDisplay() {
	printf "$Name: Static: $Count: $1\n"

	gsettings set org.gnome.desktop.background picture-uri "file://$1"
}



Random() {
	MIN=0
	MAX=${#Files[@]}

	Ret=-1
	while (( $Ret < $MIN || $Ret > $MAX ))
	do
		Ret=$RANDOM$RANDOM$RANDOM$RANDOM

		let "Ret %= $MAX"

  		[ -z $Ret ] && Ret=0
	done

	printf $Ret
}


gsettings set org.gnome.desktop.background picture-options "$Option"


Count=0
while (true)
do
	if [ $Count = 0 ]
	then
		printf "\n\n\n$Name: Building list.. "


		Files=($Directory/**/*.{gif,jpg,jpeg,png})

		printf "${#Files[@]} - OK!\n\n"

		Count=1000
	fi

	File=${Files[`Random`]}

	if [ -e "$File" ]
	then
		printf "FILE: $File\n"

		Ext=${File##*.}

		case "$Ext" in

		"gif")
			if [ -e "/usr/bin/convert" ]
			then
				mkdir "$Temp"

				convert "$File" "$Temp/GIF.png"

				GList=($Temp/*.png)

				if [ ${#GList[@]} -gt 1 ]
				then
					printf "$Name: Dynamic: $Count: $File\n"

					Start=0

					let "Eind=($SECONDS + $Seconden)"

					while [ "$Start" -lt "$Eind" ]
					do
						for F in ${GList[@]}
						do
							GBDisplay "$F"

							sleep 1
						done

						Start=$SECONDS
					done
				else
					GBDisplay "$File"
					sleep $Seconden
				fi

				Clean
			else
				GBDisplay "$File"
				sleep $Seconden
			fi
			;;

		"jpg")
			GBDisplay "$File"
			sleep $Seconden
			;;

		"jpeg")
			GBDisplay "$File"
			sleep $Seconden
			;;

		"png")
			GBDisplay "$File"
			sleep $Seconden
			;;

		esac
	fi

	((Count--))
done


# +----------------------------------------------------------------------------------+
# |   END!                                                                           |
# +----------------------------------------------------------------------------------+
