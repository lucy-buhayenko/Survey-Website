const readinessCtx =
document.getElementById("readinessChart");

if(readinessCtx){

new Chart(readinessCtx,{

type:"line",

data:{
labels:[
"Jan",
"Feb",
"Mar",
"Apr",
"May",
"Jun"
],

datasets:[{
label:"Readiness Score",

data:[58,63,67,74,79,82],

borderColor:"#287C49",

backgroundColor:
"rgba(40,124,73,.2)",

fill:true,

tension:.4
}]
}
});
}

const barrierCtx =
document.getElementById("barrierChart");

if(barrierCtx){

new Chart(barrierCtx,{

type:"doughnut",

data:{
labels:[
"Transportation",
"Housing",
"Mental Health",
"Documentation"
],

datasets:[{
data:[35,25,20,20],

backgroundColor:[
"#D23838",
"#EBB234",
"#287C49",
"#2D5C8A"
]
}]
}
});
}