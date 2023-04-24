# recursive_udf
finding recursive hierarchy 


### v1

supports basic iterative tasks

for eg:
display numbers 1 to N

say N is 10

```EXECUTE FUNCTION rcte("SELECT 1 as r", "SELECT m.r+1 as r FROM $1 as m WHERE m.r<10", true);```


### v2

support level exit, and passing positional parameters to inner queries