function recursive_cte(anchor , recursive, log) {
    let isLog = false;

    if(log!=undefined && log==true)
        isLog = true;
    
    let res = {"res":[], "log":[]}
    
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
        res['log'].push(err);
        return isLog?res:res['res'];
    }

    // execute anchor 

    // state expression 
    let workSet = []

    try{
        const anchorExec = N1QL("EXECUTE `"+anchorPname+"`");
        for(const doc of anchorExec) {
            workSet.push(doc);
        }
    }
    catch(err){
        res['log'].push("failed to execute anchor");
        res['log'].push("err");
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
        res['log'].push(err)
        return isLog?res:res['res'];
    }

    let level = 0;

    while(workSet.length!=0) {
        // execute recursive query
        let newWorkSet = []
        try{
            const recursiveExec = N1QL("EXECUTE `"+recursivePname+"`", [workSet])

            // empty workSet to populate again
            for(const doc of recursiveExec) {
                newWorkSet.push(doc)
            }
        }
        catch(err) {
            res['log'].push("failed execute recursive");
            res['log'].push(err);
        }

        if(newWorkSet.length==0)
            break;
        
        res["res"].push(...newWorkSet);
        workSet = newWorkSet;
    }

    return isLog?res:res['res'];
}
