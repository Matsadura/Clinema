#!/bin/bash

# Install HTTPie ( Better Curl Alternative) if it does not exist
if [ ! -f "/usr/bin/httpie" ]; then
    curl -SsL https://packages.httpie.io/deb/KEY.gpg | sudo gpg --dearmor -o /usr/share/keyrings/httpie.gpg
    echo "deb [arch=amd64 signed-by=/usr/share/keyrings/httpie.gpg] https://packages.httpie.io/deb ./" | sudo tee /etc/apt/sources.list.d/httpie.list > /dev/null
    sudo apt update
    sudo apt install httpie
    sudo apt update && sudo apt upgrade -y httpie
fi


# Create an user and Get JWT token
API=http://localhost:5000/api

http POST $API/register email=test@email.com password=test_password first_name=test_first last_name=test_last

TOKEN=$(http POST $API/login email=test@email.com password=test_password | grep -w 'token' | awk '{print $2}' | tr -d '",')

echo "Token: $TOKEN"

# GET USER_id
USER_ID=$(http  GET $API/users/profile Authorization:"Bearer $TOKEN" | grep -w 'id' | awk '{print $2}' | tr -d '",')

echo -e "\nUser ID: $USER_ID\n"

# Create 3 New Movies
http  POST $API/movies/ Authorization:"Bearer $TOKEN" name="The Matrix" description="A man realizes he is living in a simulation" poster="hna site"
MOVIE_ID_1=$(http  POST $API/movies/ Authorization:"Bearer $TOKEN" name="Fight Club" description="A ticking-time-bomb insomniac and a slippery soap salesman channel primal male aggression into a shocking new form of therapy. Their concept catches on, with underground \"fight clubs\" forming in every town, until an eccentric gets in the way and ignites an out-of-control spiral toward oblivion." poster="/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg" | grep -w 'id' | awk '{print $2}' | tr -d '",')
MOVIE_ID_2=$(http  POST $API/movies/ Authorization:"Bearer $TOKEN" name="D.E.B.S." description="The star of a team of teenage crime fighters falls for the alluring villainess she must bring to justice." poster="/cMwLTcG5aVBYeh5W6SVSfowboAf.jpg" | grep -w 'id' | awk '{print $2}' | tr -d '",')
MOVIE_ID_3=$(http  POST $API/movies/ Authorization:"Bearer $TOKEN" name="A Grand Day Out" description="Wallace and Gromit have run out of cheese, and this provides an excellent excuse for the duo to take their holiday to the moon, where, as everyone knows, there is ample cheese.  Preserved by the Academy Film Archive." poster="/8fJHkmlfFAKtGx62WdYlIdn9pny.jpg" | grep -w 'id' | awk '{print $2}' | tr -d '",')

echo -e "\nMovie ID 1: $MOVIE_ID_1\n"
echo -e "\nMovie ID 2: $MOVIE_ID_2\n"
echo -e "\nMovie ID 3: $MOVIE_ID_3\n"

# Like a movie
USER_MOVIE_1=$(http  POST $API/$USER_ID/liked/ Authorization:"Bearer $TOKEN" user_id=$USER_ID movie_id=$MOVIE_ID_1 save:=true)

echo -e "\n USER_MOVIE_1: $USER_MOVIE_1\n"
# Make movie as save
USER_MOVIE_2=$(http  POST $API/$USER_ID/save/ Authorization:"Bearer $TOKEN" user_id=$USER_ID movie_id=$MOVIE_ID_2 save:=true)

echo -e "\n USER_MOVIE_2: $USER_MOVIE_2\n"

# save and likes same movie
USER_MOVIE_3=$(http  POST $API/$USER_ID/save/ Authorization:"Bearer $TOKEN" user_id=$USER_ID movie_id=$MOVIE_ID_3 save:=true like:=true)

echo -e "\n USER_MOVIE_3: $USER_MOVIE_3\n"