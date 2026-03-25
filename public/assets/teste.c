#include <stdio.h>

int main(){
int tempo,mes;
float lucro,custo,valor_d;

printf("Digite o tempo em anos: ");
scanf("%d",&tempo);

printf("Digite o lucro: ");
scanf("%f",&lucro);

printf("Digite o custo: ");
scanf("%f",&custo);

valor_d= 2*custo;
mes=tempo*12;

return 0;
}