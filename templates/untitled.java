# Check if a binary tree is subtree of another binary tree
// Set 1 "same tree"
// Time Complexity: O(mn)
/* A binary tree node has data, left child and right child */
struct node
{
    int data;
    struct node* left;
    struct node* right;
};
/* A utility function to check whether trees with roots as root1 and
   root2 are identical or not */
bool areIdentical(struct node * root1, struct node *root2)
{
    /* base cases */
    if (root1 == NULL && root2 == NULL)
        return true;
 
    if (root1 == NULL || root2 == NULL)
        return false;
 
    /* Check if the data of both roots is same and data of left and right
       subtrees are also same */
    return (root1->data == root2->data   &&
            areIdentical(root1->left, root2->left) &&
            areIdentical(root1->right, root2->right) );
}
/* This function returns true if S is a subtree of T, otherwise false */
bool isSubtree(struct node *T, struct node *S)
{
    /* base cases */
    if (S == NULL)
        return true;
 
    if (T == NULL)
        return false;
 
    /* Check the tree with root as current node */
    if (areIdentical(T, S))
        return true;
 
    /* If the tree with root as current node doesn't match then
       try left and right subtrees one by one */
    return isSubtree(T->left, S) ||
           isSubtree(T->right, S);
}

// Set 2
// http://www.geeksforgeeks.org/check-binary-tree-subtree-another-binary-tree-set-2/

# ascii and kanji character bakcspace
// http://discuss.joelonsoftware.com/default.asp?interview.11.334807.4

# Spiral Matrix 
// 先判断一下行数和列数来确定螺旋的层数。另一个是因为一层会占用两行两列，
// 如果是单数的，最后要将剩余的走完。所以最后还要做一次判断
// 时间复杂度是O(m*n)，m，n是分别是矩阵的行数和列数，空间复杂度是O(1)
public class Solution {
    public List<Integer> spiralOrder(int[][] matrix) {
        List<Integer> res = new ArrayList<Integer>();
        if(matrix == null || matrix.length==0 || matrix[0].length==0)  
        return res;  
        int min = Math.min(matrix.length, matrix[0].length);
        int level = min/2;
        for (int i=0; i<level; i++) {
            for (int j=i; j<=matrix[0].length-2-i; j++) {
                res.add(matrix[i][j]);
            }
            for (int j=i; j<=matrix.length-2-i; j++) {
                res.add(matrix[j][matrix[0].length-1-i]);
            }
            for (int j=matrix[0].length-1-i; j>=i+1; j--) {
                res.add(matrix[matrix.length-1-i][j]);
            }
            for (int j=matrix.length-1-i; j>=i+1; j--) {
                res.add(matrix[j][i]);
            }
        }
        if (min%2==1) {
            if (matrix[0].length > matrix.length) {
                for (int j=level; j<=matrix[0].length-1-level; j++) {
                    res.add(matrix[level][j]);
                }
            } else {
                for (int j=level; j<=matrix.length-1-level; j++) {
                    res.add(matrix[j][level]);
                }
            }
        }
        return res;
    }
}

# Spiral Matrix II
public class Solution {
    public int[][] generateMatrix(int n) {
        int index = 1;
        int level = n/2;
        int[][] res = new int[n][n];
        for(int i=0; i<level; i++) {
            for(int j=i; j<n-1-i; j++) {
                res[i][j] = index;
                index ++;
            }
            for(int j=i; j<n-1-i; j++) {
                res[j][n-1-i] = index;
                index ++;
            }
            for(int j=n-1-i; j>i; j--) {
                res[n-1-i][j] = index;
                index ++;
            }
            for(int j=n-1-i; j>i; j--) {
                res[j][i] = index;
                index ++;
            }
        }
        if(n%2==1) {
            res[level][level] = index;
        }
        return res;
    }
}