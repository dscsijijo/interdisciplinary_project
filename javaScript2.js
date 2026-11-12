let MQ;
let problemI;
let problemSpan;
let answerI;
let answerSpan;
let answer
document.addEventListener('DOMContentLoaded',()=>{
    MQ=MathQuill.getInterface(2);
    problemI=document.getElementById("problem");
    problemSpan=MQ.StaticMath(problemI);
    answerI=document.getElementById("answer");
    answerSpan=MQ.MathField(answerI,{
        handlers: {
            edit: function () {
                answer= answerSpan.latex();
            }
        }
    });
});
function next(){
    let num=parseInt(Math.random()*5);
    let problem={
        0:'x+3x^{-1}-\\frac{7}{3}\\cdot x^{-3}+1',
        1:'2',
        2:'3',
        3:'4',
        4:'5'
    };
    let answer={
        0:'',
        1:'',
        2:'',
        3:'',
        4:''
    }
    problem.latex(problem[num]);
}