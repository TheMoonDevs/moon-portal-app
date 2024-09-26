TIME=$1
if [ -z "$TIME" ]; then
    TIME=1
fi
LOGS=$(git log -20 --pretty=format:"%h %s " --since="${TIME} days ago" --abbrev-commit)
count=0
echo "$LOGS" | while read -r line; do
    #echo "$line"
    SHA=$(echo "$line" | awk '{print $1}')
    MSG=$(echo "$line" | awk '{$1 = ""; print $0;}')
    echo -e "${count} - ${COLOR_YELLOW}${SHA} ${COLOR_RESET}${MSG}"
    ((count+=1))
done
read -p "pick from which no. to copy logs: " COPY_FROM
FULL_LOGS=""
for ((i=((COPY_FROM+1)); i>0; i--)); do
    LINE=$(echo "$LOGS" | head -n $i | tail -n 1)
    SHA=$(echo "$LINE" | awk '{print $1}')
    MSG=$(echo "$LINE" | awk '{$1 = ""; print $0;}')
    FULL_LOGS="${FULL_LOGS}\n${MSG}"
done
echo -e "Logs copied to clipboard:\n${FULL_LOGS}"