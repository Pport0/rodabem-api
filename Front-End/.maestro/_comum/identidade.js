function comDigitos(base) {
  var d = base.split('').map(Number);
  var s = 0;
  for (var i = 0; i < 9; i++) s += d[i] * (10 - i);
  var r = (s * 10) % 11;
  var primeiro = (r === 10 || r === 11) ? 0 : r;

  d.push(primeiro);
  s = 0;
  for (var i = 0; i < 10; i++) s += d[i] * (11 - i);
  r = (s * 10) % 11;
  var segundo = (r === 10 || r === 11) ? 0 : r;

  return base + '' + primeiro + '' + segundo;
}

var semente = String(Date.now()).slice(-9);

output.cpf = comDigitos(semente);
output.cpfInvalido = semente + '00';
output.telefone = '62' + semente;
output.email = 'maestro' + semente + '@teste.local';
output.nome = 'Maestro ' + semente;
output.senha = 'senha123';

output.cpfDoCadastro = output.cpf;
output.telefoneDoCadastro = output.telefone;
output.emailDoCadastro = output.email;
output.senhaDoCadastro = output.senha;
