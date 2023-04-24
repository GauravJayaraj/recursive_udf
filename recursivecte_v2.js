function recursive_cte(anchor , recursive, config) {
    let isLog = false;
    let anchorArgs=[];
    let recursiveArgs=[];
    let levelLimit = -1;
    // if(log!=undefined && log==true)
    //     isLog = true;

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
    }
    
    let res = {"res":[], "log":[]}
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
    catch {
        res['log'].push("couldn't prepare anchor");
        return isLog?res:res['res'];
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
        res['log'].push(err)
        return isLog?res:res['res'];
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
    }
    catch(err) {
        res['log'].push("couldn't prepare recursive");
        res['log'].push(err);
        return isLog?res:res['res'];
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
            res['log'].push(err)
        }

        if(newWorkSet.length==0)
            break;
        
        res["res"].push(...newWorkSet);
        workSet = newWorkSet;

        level++;
    }

    return isLog?res:res['res'];
}