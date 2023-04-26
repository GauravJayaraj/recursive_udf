# recursive_udf
finding recursive hierarchy 


### v1

supports basic iterative tasks

for eg:
display numbers 1 to N

say N is 10

```EXECUTE FUNCTION rcte("SELECT 1 as r", "SELECT m.r+1 as r FROM $1 as m WHERE m.r<10", true);```


### v2

adds support for level exit, and passing positional parameters to inner queries

```EXECUTE FUNCTION rcte("SELECT e.*,0 as elevel FROM `rcte`._default.employees e WHERE e.reportsTo IS MISSING", "SELECT e.*, m.elevel+1 as elevel FROM `rcte`._default.employees e JOIN $1 m ON m.name=e.reportsTo",{});```

```SELECT e.*, rcte("SELECT e1.*,0 as rlevel FROM `rcte`._default.employees e1 WHERE e1.reportsTo=$1" , "SELECT e2.*, m.rlevel+1 as rlevel FROM $1 m, `rcte`._default.employees e2 WHERE m.name=e2.reportsTo" , { "anchorArgs":[e.name], "levelLimit":1}) as reportsToHierarchy  FROM `rcte`._default.employees e;```


### v3

add support for cycle detection

```EXECUTE FUNCTION rcte("SELECT 0 as depth, 1 as _from, 1 as _to" , "SELECT m.depth+1 as depth, c._from, c._to FROM $1 m, `rcte`._default.cycleData c WHERE c._from = m._to", {"log":true, "cycleFields":["_from", "_to"]});```


### v4

catch and throw errors where required
add utility to display explain in log

```EXECUTE FUNCTION rcte("SELECT 0 as depth, 1 as _from, 1 as _to" , "SELECT m.depth+1 as depth, c._from, c._to FROM $1 m, `rcte`._default.cycleData c WHERE c._from = m._to", {"log":true, "cycleFields":["_from", "_to"], "explain":true});```