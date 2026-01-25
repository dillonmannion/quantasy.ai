-- Enable INSERT/UPDATE for algorithm_outputs table
-- Required for VBD algorithm to save results

DROP POLICY IF EXISTS "Users can manage own outputs" ON algorithm_outputs;

CREATE POLICY "Users can manage own outputs" ON algorithm_outputs
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
