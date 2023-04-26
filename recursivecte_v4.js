
function createhash() {
    let h = {};

    const getVal = function(key) {
        return h[key]==undefined?false:true;
    }

    const setVal = function(key) {
        h[key] = true;
    }

    return {setVal, getVal};
}

function cycleCheck(cycleFields, hash, workSet) {
    let cycleTrim = [];
    for(const doc of workSet) {
        let key = [];
        for(const field of cycleFields) {
            if(doc[field]!=undefined){
                key.push(String(doc[field]));
            }
        }

        // create hashKey
        hashKey = key.join(String.fromCharCode(30));


        if(hash.getVal(hashKey)==true){
            continue;
        }
        else{
            hash.setVal(hashKey);
            cycleTrim.push(doc);
        }
    }

    return cycleTrim;
}


function logExplain(anchor, recursive) {
    let anchorPlanEx;
    let recursivePlanEx;
    let anchorPlan=[];
    let recursivePlan=[];
    
    try{
        anchorPlanEx = N1QL("EXPLAIN "+anchor);

        for(const doc of anchorPlanEx) {
            anchorPlan.push(doc);
        }
    }catch(err) {
        anchorPlan = "couldn't get anchor plan "+err;
    }

    try{
        recursivePlanEx = N1QL("EXPLAIN "+recursive);

        for(const doc of recursivePlanEx) {
            recursivePlan.push(doc);
        }
    }catch(err) {
        recursivePlan = "couldn't get recursive plan "+err;
    }

    return [anchorPlan, recursivePlan];
}

function recursive_cte(anchor , recursive, config) {
    let isLog = false;
    let anchorArgs=[];
    let recursiveArgs=[];
    let cycleFields=[];
    let hash;    
    let levelLimit = -1;
    let isExplain = false;

    let res = {"res":[], "log":[]}


    if(config!=undefined) {
        if(config.log!=undefined && config.log==true) {
            isLog = true;
        }

        if(config.anchorArgs!=undefined) {
            anchorArgs = config.anchorArgs;
        }

        if(config.recursiveArgs!=undefined) {
            recursiveArgs = config.recursiveArgs;
        }

        if(config.levelLimit!=undefined && config.levelLimit>0) {
            levelLimit = config.levelLimit;
        }

        if(config.cycleFields!=undefined && config.cycleFields.length>0) {
            res['log'].push("Got cycle fields "+ config.cycleFields)
            // for(const field of config.cycleFields) {
            //     cycleFields.push(field);
            // }
            cycleFields = config.cycleFields;
            res['log'].push(cycleFields);
            // init hash
            hash = createhash();

        }

        if(config.explain!=undefined) {
            isExplain = true;
        }

    }
    

    // init state
    recursiveArgs.push(0);
    
    // Prepare anchor statement
    let anchorPname = "";
    try{
        const anchor_prep = N1QL("PREPARE FORCE "+anchor);
        
        for(const ap of anchor_prep) {
            anchorPname = ap["name"];
            break;
        }

        res['log'].push("prepared anchor");
    }
    catch(err) {
        res['log'].push("couldn't prepare anchor");
        throw err;
    }

    // execute anchor 

    // state expression 
    let workSet = []

    try{
        const anchorExec = N1QL("EXECUTE `"+anchorPname+"`",anchorArgs);
        for(const doc of anchorExec) {
            workSet.push(doc);
        }
    }
    catch(err) {
        res['log'].push("failed to execute anchor");
        throw err;
    }

    // cycle check
    if(cycleFields.length>0) {
        res['log'].push("cycle check on fields "+cycleFields)
        workSet = cycleCheck(cycleFields, hash, workSet);
    }

    // populate root level( level 0 )
    res['res'].push(...workSet);

    
    // prepare recursive statement

    let recursivePname ="";
    try{
        const recursive_prep = N1QL("PREPARE FORCE "+recursive);

        for(const rp of recursive_prep) {
            recursivePname = rp["name"];
            break;
        }
        res['log'].push("prepared recursive");
        res['log'].push("recursive query plan");
        res['log'].push(recursivePname);
    }
    catch(err) {
        res['log'].push("couldn't prepare recursive");
        throw err;
    }

    let level = 0;

    while(workSet.length!=0) {

        // exit on level condition
        if(levelLimit>0 && level>=levelLimit) {
            res['log'].push("Exit on level condition: levelLimit="+levelLimit.toString())
            break;
        }

        // execute recursive query
        let newWorkSet = []

        // set state $1
        recursiveArgs[0] = workSet;

        try{
            const recursiveExec = N1QL("EXECUTE `"+recursivePname+"`", recursiveArgs)

            // empty workSet to populate again
            for(const doc of recursiveExec) {
                newWorkSet.push(doc)
            }
        }
        catch(err){
            res['log'].push("failed execute recursive");
            throw err;
        }

        // cycle check
        if(cycleFields.length>0) {
            newWorkSet = cycleCheck(cycleFields, hash, newWorkSet);
        }

        if(newWorkSet.length==0)
            break;

        
        res["res"].push(...newWorkSet);
        workSet = newWorkSet;

        level++;
    }

    if(isExplain) {
        res["log"].push("explain results:");
        const [anchorPlan, recursivePlan] = logExplain(anchor, recursive);
        res["log"].push("anchor plan:");
        res["log"].push(anchorPlan);

        res["log"].push("recursive plan:");
        res["log"].push(recursivePlan);
    }


    return isLog?res:res['res'];
}