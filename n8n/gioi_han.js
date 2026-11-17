// Mỗi vòng chờ 1 phút. Quá 40 vòng (khoảng 40 phút) mà video chưa xong thì dừng, tránh lặp mãi.
if ($runIndex >= 40) throw new Error('JSON2Video làm video quá 40 phút chưa xong. Mã dự án: ' + ($json.movie?.project || '?'));
return $input.all();
